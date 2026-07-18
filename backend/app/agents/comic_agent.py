"""
Comic Agent — LLM generates a JSON screenplay (NOT HTML).
Backend queries Microsoft Foundry IQ (Azure AI Search Index) for best canvas match, assembles pre-built HTML panels.
"""
import json
import re
from typing import Dict, Any, List, Optional
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers.json import parse_partial_json
from app.config import get_llm
from app.graph.state import AgentState

CLUSTER_ROSTER = {
    "dc_justice": {
        "characters": ["batman", "superman", "flash", "wonderwoman"],
        "backgrounds": ["bg-gotham", "bg-metropolis", "bg-speedforce", "bg-themyscira"],
        "description": "DC Justice Universe - Batman, Superman, Flash, Wonder Woman",
        "actions": ["KAPOW!", "BAM!", "WHOOSH!", "ZAP!", "BOOM!", "CLANG!", "CRASH!"]
    },
    "marvel_mashup": {
        "characters": ["bat-spider", "iron-bat", "smash-dash", "skull-claw"],
        "backgrounds": ["bg-1", "bg-2", "bg-3", "bg-4"],
        "description": "Marvel Mashup - Crossover heroes with combined powers",
        "actions": ["POW!", "BAM!", "CRASH!", "ZAP!", "THWIP!", "WHAM!", "BOOM!", "SMASH!"]
    },
    "disney": {
        "characters": ["mickey", "minnie", "donald", "goofy"],
        "backgrounds": ["bg-toontown", "bg-steamboat", "bg-clubhouse", "bg-magic"],
        "description": "Disney Classic - Mickey, Minnie, Donald, Goofy",
        "actions": ["BOING!", "SPLAT!", "BONK!", "WHOOSH!", "POP!", "BAM!", "YIKES!"]
    },
    "tom_jerry": {
        "characters": ["tom", "jerry", "spike", "nibbles"],
        "backgrounds": ["bg-kitchen", "bg-livingroom", "bg-yard", "bg-mousehole"],
        "description": "Tom & Jerry - Cat and mouse chaos",
        "actions": ["BONK!", "ZAP!", "CRASH!", "SPLAT!", "WHOOSH!", "CLANG!", "BOOM!"]
    },
    "kick_buttowski": {
        "characters": ["kick", "gunther", "kendall", "brad"],
        "backgrounds": ["bg-gully", "bg-neighborhood", "bg-garage", "bg-hurtsmore"],
        "description": "Kick Buttowski - Suburban daredevil",
        "actions": ["VROOOM!", "SKRRT!", "AWESOME!", "SPLAT!", "CRASH!", "BAM!", "WHOOSH!"]
    },
    "stranger_things": {
        "characters": ["eleven", "dustin", "hopper", "demogorgon"],
        "backgrounds": ["bg-upsidedown", "bg-lab", "bg-basement", "bg-hawkins"],
        "description": "Stranger Things - Hawkins supernatural world",
        "actions": ["ZAP!", "BOOM!", "CRACK!", "FLASH!", "WHOOSH!", "SLAM!"]
    },
    "ben10": {
        "characters": ["heatblast", "diamondhead", "xlr8", "upgrade"],
        "backgrounds": ["bg-alien-city", "bg-space", "bg-omnitrix", "bg-desert"],
        "description": "Ben 10 - Alien hero transformations",
        "actions": ["BLAST!", "SMASH!", "ZAP!", "WHAM!", "BOOM!", "CRASH!"]
    },
    "glitch_rider": {
        "characters": ["pixel_hacker"],
        "backgrounds": ["bg-neotokyo", "bg-matrix", "bg-circuit", "bg-void"],
        "description": "Glitch Rider - Cyberpunk pixel art hacker",
        "actions": ["ZAP!!", "GLITCH!", "HACK!", "BOOM!", "BREACH!", "RUN!"]
    }
}


def sanitize_llm_json(raw: str) -> str:
    result = []
    in_string = False
    escape_next = False
    for char in raw:
        if escape_next:
            result.append(char)
            escape_next = False
            continue
        if char == '\\':
            result.append(char)
            escape_next = True
            continue
        if char == '"':
            in_string = not in_string
            result.append(char)
            continue
        if in_string:
            if char == '\n':
                result.append('\\n')
            elif char == '\r':
                result.append('\\r')
            elif char == '\t':
                result.append('\\t')
            else:
                result.append(char)
        else:
            result.append(char)
    return ''.join(result)


async def generate_comic(state: AgentState) -> Dict[str, Any]:
    llm = get_llm()
    concept = state["concept"]
    cluster = state.get("selected_template")
    
    if not cluster:
        return {
            "content": {
                "needs_selection": True,
                "is_finished": False,
                "panels": []
            }
        }

    roster = CLUSTER_ROSTER.get(cluster, CLUSTER_ROSTER["dc_justice"])
    chars_str = ", ".join(roster["characters"])
    bgs_str = ", ".join(roster["backgrounds"])
    actions_str = ", ".join(roster["actions"])

    prompt = PromptTemplate.from_template("""
You are a Comic Storyboard Writer for KnowledgeForge.
Your task is to explain '{concept}' through a 4-panel comic using the '{cluster}' universe.

CHARACTERS available: {characters}
BACKGROUNDS available: {backgrounds}
ACTIONS available: {actions}

For each panel, assign a character, background, pose, and write educational dialogue.
Dialogue should explain one part of the concept in the character's personality.

Poses must be one of: default, action, thinking, pointing

Respond in JSON ONLY:
{{
  "cluster": "{cluster}",
  "title": "Comic title about the concept",
  "is_finished": false,
  "panels": [
    {{
      "character": "batman",
      "background": "bg-gotham",
      "pose": "thinking",
      "canvas_query": "Batman thinking in dark Gotham",
      "dialogue": "Educational dialogue here (1-2 sentences max)",
      "action": "ZAP!",
      "caption": "optional top caption text (or empty string)"
    }}
  ]
}}
""")

    try:
        chain = prompt | llm
        response = await chain.ainvoke({
            "concept": concept,
            "cluster": cluster,
            "characters": chars_str,
            "backgrounds": bgs_str,
            "actions": actions_str
        })
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        data = parse_partial_json(sanitize_llm_json(content.strip()))
        # Assemble HTML panels
        assembled = await assemble_panels(data, cluster)
        return {"content": assembled}
    except Exception as e:
        print(f"Comic generation failed: {e}")
        return {
            "content": {
                "cluster": cluster,
                "title": f"Understanding {concept}",
                "css_bundle": f"{cluster}.css",
                "is_finished": True,
                "panels": [_fallback_panel(cluster, concept)]
            }
        }


async def generate_next_comic_page(
    concept: str, cluster: str, page_num: int, story_so_far: str
) -> Dict[str, Any]:
    """Generate the next page of a multi-page comic."""
    llm = get_llm()
    roster = CLUSTER_ROSTER.get(cluster, CLUSTER_ROSTER["dc_justice"])
    chars_str = ", ".join(roster["characters"])
    bgs_str = ", ".join(roster["backgrounds"])
    actions_str = ", ".join(roster["actions"])

    prompt = PromptTemplate.from_template("""
You are continuing a comic about '{concept}' in the '{cluster}' universe.
This is page {page_num}. Here is the story so far:
{story_so_far}

Continue the educational story with 4 new panels, covering the next part of the concept.
CHARACTERS available: {characters}
BACKGROUNDS available: {backgrounds}
ACTIONS available: {actions}
Poses: default, action, thinking, pointing

Respond in JSON ONLY:
{{
  "is_finished": false,
  "panels": [
    {{
      "character": "batman",
      "background": "bg-gotham",
      "pose": "thinking",
      "canvas_query": "descriptive scene query",
      "dialogue": "Educational dialogue",
      "action": "ZAP!",
      "caption": ""
    }}
  ]
}}
""")

    try:
        chain = prompt | llm
        response = await chain.ainvoke({
            "concept": concept,
            "cluster": cluster,
            "page_num": page_num,
            "story_so_far": story_so_far,
            "characters": chars_str,
            "backgrounds": bgs_str,
            "actions": actions_str
        })
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        data = parse_partial_json(sanitize_llm_json(content.strip()))
        assembled = await assemble_panels(data, cluster)
        return assembled
    except Exception as e:
        print(f"Comic pagination failed: {e}")
        return {"is_finished": True, "panels": [_fallback_panel(cluster, concept)]}


async def assemble_panels(script: dict, cluster: str) -> dict:
    """Inject dialogue/action into canvas HTML from Microsoft Foundry IQ."""
    try:
        from app.db.comic_canvas_db import query_canvas
        panels_html = []
        for panel in script.get("panels", []):
            character = panel.get("character", "batman")
            background = panel.get("background", "bg-gotham")
            pose = panel.get("pose", "default")
            canvas_query = panel.get("canvas_query", f"{character} in {background} scene")
            dialogue = panel.get("dialogue", "...")
            action = panel.get("action", "ZAP!")
            caption = panel.get("caption", "")

            # Query canvas store for best match
            results = query_canvas(
                canvas_query, cluster,
                character=character,
                background=background,
                pose=pose,
                n_results=1
            )
            if results:
                canvas_meta = results[0]
                html = canvas_meta["canvas_html"]
            else:
                # Fallback: build HTML directly from canvas_library
                from app.db.canvas_library import ALL_CANVASES
                matching = [c for c in ALL_CANVASES
                            if c["cluster"] == cluster
                            and c["character"] == character
                            and c["background"] == background
                            and c["pose"] == pose]
                html = matching[0]["canvas_html"] if matching else f'<div class="comic-card {background}"><div class="speech-bubble">{dialogue}</div></div>'

            # Inject dialogue and action
            html = html.replace("{{DIALOGUE}}", dialogue)
            html = html.replace("{{ACTION}}", action)
            html = html.replace("{{CAPTION}}", caption or f"EXPLORING {cluster.upper()}")

            panels_html.append({
                "character": character,
                "background": background,
                "pose": pose,
                "dialogue": dialogue,
                "action": action,
                "html": html
            })

        return {
            "cluster": cluster,
            "title": script.get("title", "The Comic"),
            "css_bundle": f"{cluster}.css",
            "is_finished": script.get("is_finished", True),
            "panels": panels_html
        }
    except Exception as e:
        print(f"Panel assembly failed: {e}")
        return {"cluster": cluster, "css_bundle": f"{cluster}.css", "is_finished": True, "panels": []}


def _fallback_panel(cluster: str, concept: str) -> dict:
    roster = CLUSTER_ROSTER.get(cluster, CLUSTER_ROSTER["dc_justice"])
    char = roster["characters"][0]
    bg = roster["backgrounds"][0]
    return {
        "character": char,
        "background": bg,
        "pose": "default",
        "dialogue": f"Let's explore {concept}!",
        "action": "GO!",
        "html": f'<div class="comic-card {bg}"><div class="speech-bubble" style="top:15px;left:15px;">Let\'s explore {concept}!</div><div class="action-text">GO!</div></div>'
    }
