import os
import json
import requests
import hashlib
import random
from typing import List, Dict, Any

MEME_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'meme', 'programmerhumor.jsonl')

AZURE_SEARCH_ENDPOINT = os.environ.get("AZURE_SEARCH_ENDPOINT")
AZURE_SEARCH_KEY = os.environ.get("AZURE_SEARCH_KEY")
AZURE_SEARCH_INDEX = os.environ.get("AZURE_SEARCH_INDEX")

headers = {
    "Content-Type": "application/json",
    "api-key": AZURE_SEARCH_KEY
}

def load_memes():
    """Verify if memes are already present in Azure Search. If not, ingest them."""
    check_url = f"{AZURE_SEARCH_ENDPOINT.rstrip('/')}/indexes/{AZURE_SEARCH_INDEX}/docs/search?api-version=2023-11-01"
    check_payload = {
        "filter": "cluster eq 'meme'",
        "top": 1,
        "select": "id"
    }
    try:
        response = requests.post(check_url, headers=headers, json=check_payload)
        if response.status_code == 200:
            existing_docs = response.json().get("value", [])
            if existing_docs:
                print(f"[Meme DB] Memes already present in Azure Search index '{AZURE_SEARCH_INDEX}'. Skipping ingestion.")
                return
        else:
            print(f"[Meme DB] Failed to check existing memes. Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"[Meme DB] Exception checking memes: {e}")

    if not os.path.exists(MEME_FILE):
        print(f"[Meme DB] File not found: {MEME_FILE}")
        return

    print(f"[Meme DB] Loading memes from {MEME_FILE} and ingesting into Azure Search...")
    documents = []
    max_memes = 5000
    count = 0
    
    with open(MEME_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                meme = json.loads(line)
                url = meme.get("url", "")
                if not url:
                    continue
                
                # Generate safe alphanumeric ID using MD5 hash of url
                doc_id = f"meme_{hashlib.md5(url.encode('utf-8')).hexdigest()}"
                
                # Create rich text corpus for search matches
                text_content = meme.get("title", "") + " "
                text_content += " ".join(meme.get("tags", [])) + " "
                text_content += " ".join(meme.get("categories", [])) + " "
                text_content += meme.get("image_caption", "") + " "
                text_content += " ".join(meme.get("content", []))
                
                doc = {
                    "@search.action": "upload",
                    "id": doc_id,
                    "content": text_content[:5000],  # keep content under limit
                    "description": meme.get("title", ""),
                    "cluster": "meme",
                    "character": "",
                    "background": "",
                    "pose": "",
                    "metadata": json.dumps({
                        "url": meme.get("url"),
                        "title": meme.get("title"),
                        "image_url": meme.get("image_url"),
                        "image_caption": meme.get("image_caption"),
                        "categories": meme.get("categories"),
                        "tags": meme.get("tags"),
                        "content": meme.get("content")
                    })
                }
                documents.append(doc)
                count += 1
                if count >= max_memes:
                    break
            except Exception:
                pass

    print(f"[Meme DB] Read {len(documents)} memes. Uploading to Azure Search in batches...")
    
    batch_size = 100
    upload_url = f"{AZURE_SEARCH_ENDPOINT.rstrip('/')}/indexes/{AZURE_SEARCH_INDEX}/docs/index?api-version=2023-11-01"
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        payload = {"value": batch}
        try:
            res = requests.post(upload_url, headers=headers, json=payload)
            if res.status_code == 200:
                res_json = res.json()
                success_count = sum(1 for item in res_json.get("value", []) if item.get("status"))
                print(f"[Meme DB] Batch {i//batch_size + 1}: uploaded {success_count}/{len(batch)} memes.")
            else:
                print(f"[Meme DB] Batch {i//batch_size + 1} failed: Status {res.status_code}, Response: {res.text}")
        except Exception as e:
            print(f"[Meme DB] Batch {i//batch_size + 1} exception: {e}")

def _parse_meme_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Parse retrieved search document and reconstruct the meme dictionary."""
    meta = {}
    if doc.get("metadata"):
        try:
            meta = json.loads(doc["metadata"])
        except Exception:
            pass
    return {
        "url": meta.get("url", ""),
        "title": meta.get("title", ""),
        "image_url": meta.get("image_url", ""),
        "image_caption": meta.get("image_caption", ""),
        "categories": meta.get("categories", []),
        "tags": meta.get("tags", []),
        "content": meta.get("content", [])
    }

def query_memes(query: str, n_results: int = 3) -> List[Dict[str, Any]]:
    """Query Azure Search for relevant memes."""
    search_url = f"{AZURE_SEARCH_ENDPOINT.rstrip('/')}/indexes/{AZURE_SEARCH_INDEX}/docs/search?api-version=2023-11-01"
    
    payload = {
        "search": query if query and query.strip() else "*",
        "filter": "cluster eq 'meme'",
        "top": n_results
    }
    
    try:
        res = requests.post(search_url, headers=headers, json=payload)
        if res.status_code == 200:
            docs = res.json().get("value", [])
            results = [_parse_meme_doc(d) for d in docs]
            if results:
                if query and query.strip() and len(results) > 1:
                    random.shuffle(results)
                return results[:n_results]
    except Exception as e:
        print(f"[Meme DB] Search failed with exception: {e}")

    # Fallback: get any random memes
    try:
        fallback_payload = {
            "search": "*",
            "filter": "cluster eq 'meme'",
            "top": 50
        }
        res = requests.post(search_url, headers=headers, json=fallback_payload)
        if res.status_code == 200:
            docs = res.json().get("value", [])
            results = [_parse_meme_doc(d) for d in docs]
            if results:
                return random.sample(results, min(n_results, len(results)))
    except Exception as e:
        print(f"[Meme DB] Fallback query failed: {e}")

    return []
