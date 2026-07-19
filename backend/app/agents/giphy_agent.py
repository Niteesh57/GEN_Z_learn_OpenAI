"""GIPHY-backed visual lessons led by one consistent guide."""

import asyncio
import json
import os
import random
import re
from typing import Any, Dict, Iterable, List

import requests
from langchain_core.prompts import PromptTemplate

from app.config import get_llm
from app.graph.state import AgentState


GIPHY_STICKER_SEARCH_URL = "https://api.giphy.com/v1/stickers/search"
MINIMUM_GIF_COUNT = 3
MAXIMUM_GIF_COUNT = 6
REQUEST_TIMEOUT_SECONDS = 8
GUIDE_NAME = "Alex"
SEARCH_STOP_WORDS = {"a", "an", "and", "are", "about", "does", "explain", "for", "how", "in", "is", "of", "the", "to", "what", "with", "works"}


def _clean_text(value: Any, maximum: int) -> str:
    return " ".join(value.split())[:maximum] if isinstance(value, str) else ""


def _image_url(gif: Dict[str, Any]) -> str:
    images = gif.get("images") if isinstance(gif.get("images"), dict) else {}
    for rendition in ("fixed_width", "downsized", "original"):
        asset = images.get(rendition)
        if isinstance(asset, dict) and isinstance(asset.get("url"), str) and asset["url"].startswith("https://"):
            return asset["url"]
    return ""


def _normalize_gif(gif: Dict[str, Any]) -> Dict[str, str] | None:
    gif_id = _clean_text(gif.get("id"), 80)
    image_url = _image_url(gif)
    if not gif_id or not image_url:
        return None
    title = _clean_text(gif.get("title"), 100) or "Animated visual cue"
    return {
        "id": gif_id,
        "title": title,
        "alt_text": _clean_text(gif.get("alt_text"), 180) or title,
        "image_url": image_url,
        "source_url": _clean_text(gif.get("url"), 500),
        "creator": "GIPHY",
    }


def _request_giphy(url: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
    if response.status_code != 200:
        print(f"GIPHY API returned HTTP {response.status_code}.")
        return []
    payload = response.json()
    data = payload.get("data") if isinstance(payload, dict) else []
    return data if isinstance(data, list) else []


async def _fetch_gifs(concept: str) -> List[Dict[str, str]]:
    api_key = os.environ.get("GIPHY_API_KEY", "").strip()
    if not api_key:
        return []

    words = [word.lower() for word in re.findall(r"[a-zA-Z0-9]{3,}", concept) if word.lower() not in SEARCH_STOP_WORDS]
    searches = [concept[:50]]
    if len(words) >= 2:
        searches.append(" ".join(words[:4])[:50])
    searches.extend(words[:3])
    searches = list(dict.fromkeys(query for query in searches if query))

    candidates: List[Dict[str, str]] = []
    seen_ids = set()

    def append_unique(results: Iterable[Dict[str, Any]]) -> None:
        for candidate in results:
            normalized = _normalize_gif(candidate)
            if normalized and normalized["id"] not in seen_ids:
                candidates.append(normalized)
                seen_ids.add(normalized["id"])
            if len(candidates) >= MAXIMUM_GIF_COUNT * 4:
                return

    for query in searches:
        try:
            results = await asyncio.to_thread(
                _request_giphy,
                GIPHY_STICKER_SEARCH_URL,
                {
                    "api_key": api_key,
                    "q": query,
                    "limit": 25,
                    "offset": 0,
                    "rating": "g",
                    "lang": "en",
                    "bundle": "messaging_non_clips",
                },
            )
            append_unique(results)
        except (requests.RequestException, ValueError):
            print("GIPHY topic search request failed.")
        if len(candidates) >= MAXIMUM_GIF_COUNT * 2:
            break

    random.SystemRandom().shuffle(candidates)
    return candidates[:MAXIMUM_GIF_COUNT]


def _extract_json(content: Any) -> Dict[str, Any]:
    raw = content if isinstance(content, str) else str(content)
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0]
    data = json.loads(raw.strip())
    if not isinstance(data, dict):
        raise ValueError("GIF lesson response must be a JSON object.")
    return data


def _fallback_blocks(concept: str, gifs: List[Dict[str, str]]) -> List[Dict[str, str]]:
    blocks: List[Dict[str, str]] = [{
        "type": "text",
        "content": f"Hi, I’m {GUIDE_NAME}. Let’s make {concept} easier to remember by connecting each visual cue to one useful idea.",
    }]
    for index, gif in enumerate(gifs, 1):
        blocks.append({"type": "gif", "gif_id": gif["id"]})
        blocks.append({
            "type": "text",
            "content": f"Use that animation as cue {index}. The important part is not the clip itself; it is the connection you make between the visual moment and the next step in {concept}.",
        })
    blocks.append({
        "type": "text",
        "content": f"Now replay the cues in order and explain how each one connects to {concept}. That turns the visuals into a memory path instead of a distraction.",
    })
    return blocks


def _validate_blocks(data: Dict[str, Any], gifs: List[Dict[str, str]]) -> List[Dict[str, str]]:
    raw_blocks = data.get("blocks")
    if not isinstance(raw_blocks, list):
        raise ValueError("GIF lesson requires blocks.")
    known_ids = {gif["id"] for gif in gifs}
    seen_ids = set()
    blocks: List[Dict[str, str]] = []
    for block in raw_blocks:
        if not isinstance(block, dict):
            raise ValueError("Every lesson block must be an object.")
        block_type = block.get("type")
        if block_type == "text":
            content = _clean_text(block.get("content"), 420)
            if not content:
                raise ValueError("Guide text cannot be empty.")
            blocks.append({"type": "text", "content": content})
        elif block_type == "gif":
            gif_id = _clean_text(block.get("gif_id"), 80)
            if gif_id not in known_ids or gif_id in seen_ids:
                raise ValueError("Each known GIF must be used once.")
            seen_ids.add(gif_id)
            blocks.append({"type": "gif", "gif_id": gif_id})
        else:
            raise ValueError("Unsupported GIF lesson block.")
    if not blocks or blocks[0]["type"] != "text" or blocks[-1]["type"] != "text":
        raise ValueError("The guide must open and close the lesson.")
    if seen_ids != known_ids:
        raise ValueError("Every selected GIF must appear in the lesson.")
    for index, block in enumerate(blocks):
        if block["type"] == "gif" and (index == 0 or index == len(blocks) - 1 or blocks[index - 1]["type"] != "text" or blocks[index + 1]["type"] != "text"):
            raise ValueError("Every GIF must be introduced and explained by the guide.")
    return blocks


GIF_LESSON_PROMPT = PromptTemplate.from_template("""
You are {guide_name}, a friendly visual learning guide. Explain '{concept}' as one connected, accurate lesson.

You have selected these visual cues from GIPHY:
{gif_context}

Write a short learning story in which YOU speak throughout. Insert every selected GIF exactly once. Before each GIF, explain what the learner should look for; immediately after it, clearly connect the visual cue back to the concept. Do not claim the GIF literally demonstrates technical facts it cannot show. Use it as a memorable metaphor or moment of emphasis.

Rules:
- Start and end with a text block spoken by {guide_name}.
- Every GIF must have a text block immediately before and after it.
- Keep each text block to 1–3 clear sentences and 420 characters or less.
- Teach the concept in a logical order without repeating a point.
- Do not use markdown, HTML, emojis, or mention metadata, creators, search, or GIPHY.

Return JSON only:
{{
  "blocks": [
    {{"type": "text", "content": "Guide narration."}},
    {{"type": "gif", "gif_id": "an exact selected id"}},
    {{"type": "text", "content": "Guide narration that relates the visual cue to the lesson."}}
  ]
}}
""")


async def generate_giphy_learning(state: AgentState) -> Dict[str, Any]:
    concept = _clean_text(state.get("concept"), 120) or "this topic"
    gifs = await _fetch_gifs(concept)
    has_api_key = bool(os.environ.get("GIPHY_API_KEY", "").strip())
    message = "" if len(gifs) >= MINIMUM_GIF_COUNT else (
        "GIF Learning needs a valid GIPHY_API_KEY in backend/.env before it can load visual cues."
        if not has_api_key else "GIF Learning could not find enough topic-specific visuals. Try a clearer topic phrase."
    )
    blocks: List[Dict[str, str]] = []
    if not message:
        gif_context = "\n".join(f"- id: {gif['id']}; title: {gif['title']}; description: {gif['alt_text']}" for gif in gifs)
        try:
            response = await (GIF_LESSON_PROMPT | get_llm(temperature=0.45, max_tokens=3000)).ainvoke({
                "guide_name": GUIDE_NAME,
                "concept": concept,
                "gif_context": gif_context,
            })
            blocks = _validate_blocks(_extract_json(response.content), gifs)
        except Exception as error:
            print(f"GIF lesson narration used safe fallback: {error}")
            blocks = _fallback_blocks(concept, gifs)

    return {
        "router_decision": "GIF_LEARNING",
        "template": "GIPHY_GUIDED_STORY",
        "title": f"GIF Learning: {concept}",
        "description": f"A guided visual explanation of {concept}.",
        "content": {
            "concept": concept,
            "guide": {"name": GUIDE_NAME, "role": "Visual learning guide"},
            "gifs": gifs,
            "blocks": blocks,
            "message": message,
        },
    }
