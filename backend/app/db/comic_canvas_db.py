import os
import json
import requests
from typing import List, Dict, Any, Optional

AZURE_SEARCH_ENDPOINT = os.environ.get("AZURE_SEARCH_ENDPOINT")
AZURE_SEARCH_KEY = os.environ.get("AZURE_SEARCH_KEY")
AZURE_SEARCH_INDEX = os.environ.get("AZURE_SEARCH_INDEX")

headers = {
    "Content-Type": "application/json",
    "api-key": AZURE_SEARCH_KEY
}

COMIC_CLUSTERS = (
    "byte_hero", "pixel_bot", "nova_alien", "fox_genius", "professor_panda", "wise_owl",
    "captain_cloud", "code_dragon", "hero_verse", "super_squad", "fairy_tales", "cat_vs_mouse",
    "alien_morph", "mystery_town", "stunt_rider", "cyber_runner", "superhero_universe",
    "fantasy_kingdom", "robot_academy", "alien_adventures", "mystery_detectives", "pirate_legends",
    "space_explorers", "ninja_academy",
)
ALL_COMIC_CLUSTERS_FILTER = " or ".join(f"cluster eq '{cluster}'" for cluster in COMIC_CLUSTERS)

def ingest_canvases(canvases: list):
    """Ingest canvases into Azure Cognitive Search knowledge-forge-index if not already present."""
    # Check if canvases are already in the index
    check_url = f"{AZURE_SEARCH_ENDPOINT.rstrip('/')}/indexes/{AZURE_SEARCH_INDEX}/docs/search?api-version=2023-11-01"
    check_payload = {
        "filter": ALL_COMIC_CLUSTERS_FILTER,
        "top": 1,
        "select": "id"
    }
    try:
        response = requests.post(check_url, headers=headers, json=check_payload)
        if response.status_code == 200:
            existing_docs = response.json().get("value", [])
            if existing_docs:
                print(f"[CanvasStore] Canvases already present in Azure Search index '{AZURE_SEARCH_INDEX}'. Skipping ingestion.")
                return
        else:
            print(f"[CanvasStore] Failed to check existing canvases. Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"[CanvasStore] Exception checking canvases: {e}")

    print(f"[CanvasStore] Ingesting {len(canvases)} canvases into Azure Search index '{AZURE_SEARCH_INDEX}'...")
    documents = []
    for canvas in canvases:
        doc = {
            "@search.action": "upload",
            "id": canvas["id"],
            "content": canvas["description"],
            "description": canvas["description"],
            "cluster": canvas["cluster"],
            "character": canvas["character"],
            "background": canvas["background"],
            "pose": canvas["pose"],
            "metadata": json.dumps({
                "css_bundle": canvas["css_bundle"],
                "canvas_html": canvas["canvas_html"]
            })
        }
        documents.append(doc)

    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        payload = {"value": batch}
        try:
            url = f"{AZURE_SEARCH_ENDPOINT.rstrip('/')}/indexes/{AZURE_SEARCH_INDEX}/docs/index?api-version=2023-11-01"
            res = requests.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                res_json = res.json()
                success_count = sum(1 for item in res_json.get("value", []) if item.get("status"))
                print(f"[CanvasStore] Batch {i//batch_size + 1}: successfully uploaded {success_count}/{len(batch)} canvases.")
            else:
                print(f"[CanvasStore] Batch {i//batch_size + 1} failed: Status {res.status_code}, Response: {res.text}")
        except Exception as e:
            print(f"[CanvasStore] Batch {i//batch_size + 1} exception: {e}")

def _parse_search_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Parse retrieved search document and reconstruct the canvas library dictionary."""
    meta = {}
    if doc.get("metadata"):
        try:
            meta = json.loads(doc["metadata"])
        except Exception:
            pass
            
    return {
        "id": doc.get("id"),
        "description": doc.get("description"),
        "cluster": doc.get("cluster"),
        "character": doc.get("character"),
        "background": doc.get("background"),
        "pose": doc.get("pose"),
        "css_bundle": meta.get("css_bundle", ""),
        "canvas_html": meta.get("canvas_html", "")
    }

def query_canvas(
    description: str,
    cluster: str,
    character: Optional[str] = None,
    background: Optional[str] = None,
    pose: Optional[str] = None,
    n_results: int = 1
) -> List[Dict[str, Any]]:
    """
    Look up the best matching canvas in Azure Cognitive Search.
    Priority fallback:
    1. Exact match by (cluster, character, background, pose)
    2. Partial match by (cluster, character, background)
    3. Character match (any background, any pose)
    4. Keyword score across the cluster (matching description)
    5. Fallback: first canvas in cluster
    """
    search_url = f"{AZURE_SEARCH_ENDPOINT.rstrip('/')}/indexes/{AZURE_SEARCH_INDEX}/docs/search?api-version=2023-11-01"

    def execute_search(search_text: str, filter_expr: str, top: int) -> List[Dict[str, Any]]:
        payload = {
            "search": search_text,
            "filter": filter_expr,
            "top": top
        }
        try:
            res = requests.post(search_url, headers=headers, json=payload)
            if res.status_code == 200:
                docs = res.json().get("value", [])
                return [_parse_search_doc(d) for d in docs]
        except Exception as e:
            print(f"[CanvasStore] Query failed with exception: {e}")
        return []

    # 1. Exact match by (cluster, character, background, pose)
    if character and background and pose:
        filter_expr = f"cluster eq '{cluster}' and character eq '{character}' and background eq '{background}' and pose eq '{pose}'"
        matches = execute_search("*", filter_expr, n_results)
        if matches:
            return matches

    # 2. Character + background match (any pose)
    if character and background:
        filter_expr = f"cluster eq '{cluster}' and character eq '{character}' and background eq '{background}'"
        search_text = pose if pose else "*"
        matches = execute_search(search_text, filter_expr, n_results)
        if matches:
            return matches

    # 3. Character match (any background, any pose)
    if character:
        filter_expr = f"cluster eq '{cluster}' and character eq '{character}'"
        search_text = f"{background} {pose}" if background or pose else "*"
        matches = execute_search(search_text, filter_expr, n_results)
        if matches:
            return matches

    # 4. Keyword scoring across cluster
    if description:
        filter_expr = f"cluster eq '{cluster}'"
        matches = execute_search(description, filter_expr, n_results)
        if matches:
            return matches

    # 5. Fallback: first canvas in cluster
    filter_expr = f"cluster eq '{cluster}'"
    matches = execute_search("*", filter_expr, n_results)
    if matches:
        return matches

    # 6. Absolute fallback (across any cluster)
    matches = execute_search("*", ALL_COMIC_CLUSTERS_FILTER, n_results)
    return matches
