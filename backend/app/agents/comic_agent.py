"""Generate original, education-first comic pages from local CSS canvases.

The agent writes a compact screenplay only.  The renderer receives a fixed,
sanitised local canvas rather than model-generated HTML, so every comic stays
safe, consistent, and independent of third-party character franchises.
"""
import html
from typing import Any, Dict

from langchain_core.output_parsers.json import parse_partial_json
from langchain_core.prompts import PromptTemplate

from app.config import get_llm
from app.db.comic_characters import CHARACTER_PROFILES
from app.graph.state import AgentState


def _template(
    name: str,
    emoji: str,
    characters: list[str],
    backgrounds: list[str],
    description: str,
    actions: list[str],
) -> dict:
    return {
        "name": name,
        "emoji": emoji,
        "characters": characters,
        "backgrounds": backgrounds,
        "description": description,
        "actions": actions,
    }


# Each choice is an original character or setting created for The way Gen_Z
# learn's.  These identifiers are shared by the API, UI, and local canvases.
CLUSTER_ROSTER = {
    "byte_hero": _template("Byte Hero", "⚡", ["byte_hero", "luma_spark", "pulse_dash", "code_sentinel"], ["bg-neon-city", "bg-lightning-lab", "bg-hero-roof", "bg-code-sky"], "HeroVerse • an energetic guide squad that turns hard ideas into power-ups.", ["SPARK!", "BOOST!", "ZAP!", "GO!"]),
    "pixel_bot": _template("Pixel Bot", "🤖", ["pixel_bot", "ada_circuit", "kiro_gear", "mira_mesh"], ["bg-robot-lab", "bg-circuit-class", "bg-data-grid", "bg-cyber-run"], "Robot Academy • a cheerful cast that builds each idea one clear block at a time.", ["BEEP!", "BUILD!", "CLICK!", "SYNC!"]),
    "nova_alien": _template("Nova Alien", "👾", ["nova_alien", "alien_aster", "alien_azure", "alien_vartek"], ["bg-nova-space", "bg-alien-garden", "bg-morph-zone", "bg-star-map"], "Alien Adventures • a curious crew discovering how unfamiliar systems work.", ["WHOOSH!", "ORBIT!", "GLOW!", "DISCOVER!"]),
    "fox_genius": _template("Fox Genius", "🦊", ["fox_genius", "faye_fox", "rowan_rune", "sage_ember"], ["bg-story-forest", "bg-idea-library", "bg-fairy-hills", "bg-puzzle-den"], "Fairy Tales • a clever storytelling cast solving one clue at a time.", ["AHA!", "CLUE!", "TWINKLE!", "SOLVED!"]),
    "professor_panda": _template("Professor Panda", "🐼", ["professor_panda", "captain_pippa", "mateo_map", "bamboo_ben"], ["bg-panda-lab", "bg-team-hall", "bg-bamboo-board", "bg-pirate-map"], "Super Squad • a calm teacher and team who make every lesson a quest.", ["PLAN!", "TEAM UP!", "GOT IT!", "CHEER!"]),
    "wise_owl": _template("Wise Owl", "🦉", ["wise_owl", "detective_iris", "detective_miles", "clue_wren"], ["bg-mystery-town", "bg-moon-library", "bg-detective-desk", "bg-clue-wall"], "Mystery Town • a detective crew following evidence to the answer.", ["LOOK!", "TRACE!", "CLUE!", "CASE CLOSED!"]),
    "captain_cloud": _template("Captain Cloud", "🦾", ["captain_cloud", "rocket_bloom", "rocket_hunk", "nova_navigator"], ["bg-cloud-deck", "bg-spaceport", "bg-stunt-track", "bg-sky-route"], "Space Explorers • a sky crew charting a dependable path through new ideas.", ["LIFT OFF!", "ROUTE!", "ZOOM!", "LAND!"]),
    "code_dragon": _template("Code Dragon", "🐉", ["code_dragon", "dragon_vela", "dragon_kairo", "ninja_sora"], ["bg-dojo", "bg-dragon-cave", "bg-ninja-roof", "bg-fire-grid"], "Ninja Academy • dragon mentors practicing precise, repeatable moves.", ["FOCUS!", "FLOW!", "SWISH!", "MASTER!"]),
    "hero_verse": _template("HeroVerse", "🦸", ["byte_hero", "luma_spark", "pulse_dash", "code_sentinel"], ["bg-neon-city", "bg-lightning-lab", "bg-hero-roof", "bg-code-sky"], "An original HeroVerse adventure with Byte Hero and Luma Spark.", ["SPARK!", "BOOST!", "ZAP!", "GO!"]),
    "super_squad": _template("Super Squad", "🌟", ["professor_panda", "captain_pippa", "mateo_map", "bamboo_ben"], ["bg-team-hall", "bg-panda-lab", "bg-bamboo-board", "bg-pirate-map"], "An original Super Squad mission with Professor Panda's team.", ["PLAN!", "TEAM UP!", "GOT IT!", "CHEER!"]),
    "fairy_tales": _template("Fairy Tales", "🪄", ["fox_genius", "faye_fox", "rowan_rune", "sage_ember"], ["bg-story-forest", "bg-fairy-hills", "bg-idea-library", "bg-puzzle-den"], "An original Fairy Tales journey with the Fox Genius cast.", ["AHA!", "CLUE!", "TWINKLE!", "SOLVED!"]),
    "cat_vs_mouse": _template("Cat vs Mouse", "🐾", ["mira_mouse", "theo_tails", "detective_iris", "detective_miles"], ["bg-mystery-town", "bg-detective-desk", "bg-clue-wall", "bg-moon-library"], "An original cat-and-mouse puzzle chase with Mira Mouse and Theo Tails.", ["DODGE!", "CLUE!", "CHASE!", "SOLVED!"]),
    "alien_morph": _template("Alien Morph", "🛸", ["nova_alien", "alien_aster", "alien_azure", "alien_vartek"], ["bg-morph-zone", "bg-alien-garden", "bg-nova-space", "bg-star-map"], "An original Alien Morph discovery mission with Azure and Vartek.", ["MORPH!", "GLOW!", "ORBIT!", "DISCOVER!"]),
    "mystery_town": _template("Mystery Town", "🔎", ["wise_owl", "detective_iris", "detective_miles", "clue_wren"], ["bg-mystery-town", "bg-detective-desk", "bg-clue-wall", "bg-moon-library"], "An original Mystery Town investigation with Iris and Miles.", ["LOOK!", "TRACE!", "CLUE!", "CASE CLOSED!"]),
    "stunt_rider": _template("Stunt Rider", "🏍️", ["captain_cloud", "rider_sky", "rider_finn", "rocket_hunk"], ["bg-stunt-track", "bg-sky-route", "bg-cloud-deck", "bg-spaceport"], "An original Stunt Rider run with Sky and Finn.", ["VROOM!", "JUMP!", "ZOOM!", "LAND!"]),
    "cyber_runner": _template("Cyber Runner", "💠", ["pixel_bot", "ada_circuit", "kiro_gear", "mira_mesh"], ["bg-cyber-run", "bg-circuit-class", "bg-data-grid", "bg-robot-lab"], "An original Cyber Runner route with Ada and Kiro.", ["DASH!", "SYNC!", "BEEP!", "BUILD!"]),
    "superhero_universe": _template("Superhero Universe", "🦸", ["byte_hero", "luma_spark", "pulse_dash", "code_sentinel"], ["bg-hero-roof", "bg-neon-city", "bg-code-sky", "bg-lightning-lab"], "An original superhero learning universe with a diverse hero cast.", ["SPARK!", "BOOST!", "ZAP!", "GO!"]),
    "fantasy_kingdom": _template("Fantasy Kingdom", "🧙", ["fox_genius", "faye_fox", "rowan_rune", "sage_ember"], ["bg-fairy-hills", "bg-story-forest", "bg-puzzle-den", "bg-idea-library"], "An original Fantasy Kingdom quest with Fox Genius and Faye Fox.", ["AHA!", "CLUE!", "TWINKLE!", "SOLVED!"]),
    "robot_academy": _template("Robot Academy", "🤖", ["pixel_bot", "ada_circuit", "kiro_gear", "mira_mesh"], ["bg-robot-lab", "bg-circuit-class", "bg-data-grid", "bg-cyber-run"], "An original Robot Academy lesson with a mixed robot team.", ["BEEP!", "BUILD!", "CLICK!", "SYNC!"]),
    "alien_adventures": _template("Alien Adventures", "👽", ["nova_alien", "alien_aster", "alien_azure", "alien_vartek"], ["bg-nova-space", "bg-alien-garden", "bg-star-map", "bg-morph-zone"], "An original Alien Adventures voyage with Alien Aster, Azure, and Vartek.", ["WHOOSH!", "ORBIT!", "GLOW!", "DISCOVER!"]),
    "mystery_detectives": _template("Mystery Detectives", "🕵️", ["wise_owl", "detective_iris", "detective_miles", "clue_wren"], ["bg-detective-desk", "bg-clue-wall", "bg-mystery-town", "bg-moon-library"], "An original detective case with Detective Iris and Detective Miles.", ["LOOK!", "TRACE!", "CLUE!", "CASE CLOSED!"]),
    "pirate_legends": _template("Pirate Legends", "🏴‍☠️", ["professor_panda", "captain_pippa", "mateo_map", "bamboo_ben"], ["bg-pirate-map", "bg-bamboo-board", "bg-team-hall", "bg-panda-lab"], "An original Pirate Legends voyage with Captain Pippa and Mateo Map.", ["AHOY!", "MAP!", "TEAM UP!", "TREASURE!"]),
    "space_explorers": _template("Space Explorers", "🚀", ["captain_cloud", "rocket_bloom", "rocket_hunk", "nova_navigator"], ["bg-spaceport", "bg-cloud-deck", "bg-sky-route", "bg-stunt-track"], "An original space mission with Rocket Bloom and Rocket Hunk.", ["LIFT OFF!", "ROUTE!", "ZOOM!", "LAND!"]),
    "ninja_academy": _template("Ninja Academy", "⚔️", ["code_dragon", "dragon_vela", "dragon_kairo", "ninja_sora"], ["bg-dojo", "bg-ninja-roof", "bg-dragon-cave", "bg-fire-grid"], "An original Ninja Academy practice with Dragon Vela and Dragon Kairo.", ["FOCUS!", "FLOW!", "SWISH!", "MASTER!"]),
}

DEFAULT_CLUSTER = "byte_hero"


def resolve_cluster(cluster: str | None) -> str:
    """Return an approved original template identifier."""
    return cluster if cluster in CLUSTER_ROSTER else DEFAULT_CLUSTER


def character_options(character_ids: list[str]) -> str:
    """Describe approved cast members so the model can make meaningful choices."""
    return ", ".join(
        f"{character_id} ({CHARACTER_PROFILES[character_id]['name']}, {CHARACTER_PROFILES[character_id]['gender']})"
        for character_id in character_ids
    )


def sanitize_llm_json(raw: str) -> str:
    result = []
    in_string = False
    escape_next = False
    for char in raw:
        if escape_next:
            result.append(char)
            escape_next = False
        elif char == "\\":
            result.append(char)
            escape_next = True
        elif char == '"':
            in_string = not in_string
            result.append(char)
        elif in_string and char == "\n":
            result.append("\\n")
        elif in_string and char == "\r":
            result.append("\\r")
        elif in_string and char == "\t":
            result.append("\\t")
        else:
            result.append(char)
    return "".join(result)


async def generate_comic(state: AgentState) -> Dict[str, Any]:
    concept = state["concept"]
    requested_cluster = state.get("selected_template")
    if not requested_cluster:
        return {"content": {"needs_selection": True, "is_finished": False, "panels": []}}

    cluster = resolve_cluster(requested_cluster)
    roster = CLUSTER_ROSTER[cluster]
    prompt = PromptTemplate.from_template("""
You are an educational comic storyboard writer for The way Gen_Z learn's.
Explain '{concept}' in exactly four connected panels using the original '{template_name}' template.

CHARACTER: {characters}
BACKGROUNDS: {backgrounds}
ACTIONS: {actions}

Make each panel teach a distinct step. Keep the sequence accurate, friendly, and concise.
Use only the listed character IDs and backgrounds. For four panels, rotate through at least two cast members so different named characters share the story. Poses must be: default, action, thinking, or pointing.
Respond with JSON only:
{{
  "title": "Short title about the concept",
  "is_finished": false,
  "panels": [
    {{"character": "{primary_character}", "background": "{first_background}", "pose": "thinking", "canvas_query": "short scene", "dialogue": "One concise teaching sentence.", "action": "AHA!", "caption": ""}}
  ]
}}
""")
    try:
        response = await (prompt | get_llm()).ainvoke({
            "concept": concept,
            "template_name": roster["name"],
            "characters": character_options(roster["characters"]),
            "backgrounds": ", ".join(roster["backgrounds"]),
            "actions": ", ".join(roster["actions"]),
            "primary_character": roster["characters"][0],
            "first_background": roster["backgrounds"][0],
        })
        return {"content": await assemble_panels(_parse_screenplay(response.content), cluster)}
    except Exception as exc:
        print(f"Comic generation failed: {exc}")
        return {"content": _fallback_page(cluster, concept)}


async def generate_next_comic_page(concept: str, cluster: str, page_num: int, story_so_far: str) -> Dict[str, Any]:
    """Generate the next page without accepting obsolete or external templates."""
    cluster = resolve_cluster(cluster)
    roster = CLUSTER_ROSTER[cluster]
    prompt = PromptTemplate.from_template("""
Continue a clear, step-by-step educational comic about '{concept}' using the original '{template_name}' template.
This is page {page_num}. Do not repeat what this story already taught:
{story_so_far}

CHARACTER: {characters}
BACKGROUNDS: {backgrounds}
ACTIONS: {actions}
Create exactly four new, concise panels. Rotate through at least two named cast members and use only these poses: default, action, thinking, pointing.
Respond with JSON only:
{{"title": "", "is_finished": false, "panels": [{{"character": "{primary_character}", "background": "{first_background}", "pose": "pointing", "canvas_query": "short scene", "dialogue": "One new teaching sentence.", "action": "NEXT!", "caption": ""}}]}}
""")
    try:
        response = await (prompt | get_llm()).ainvoke({
            "concept": concept,
            "template_name": roster["name"],
            "page_num": page_num,
            "story_so_far": story_so_far[-5000:],
            "characters": character_options(roster["characters"]),
            "backgrounds": ", ".join(roster["backgrounds"]),
            "actions": ", ".join(roster["actions"]),
            "primary_character": roster["characters"][0],
            "first_background": roster["backgrounds"][0],
        })
        return await assemble_panels(_parse_screenplay(response.content), cluster)
    except Exception as exc:
        print(f"Comic pagination failed: {exc}")
        return _fallback_page(cluster, concept)


def _parse_screenplay(content: str) -> dict:
    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0]
    return parse_partial_json(sanitize_llm_json(content.strip()))


async def assemble_panels(script: dict, cluster: str) -> dict:
    """Put screenplay text in a local original canvas; never query stale remote canvases."""
    from app.db.canvas_library import build_comic_canvas

    cluster = resolve_cluster(cluster)
    roster = CLUSTER_ROSTER[cluster]
    panels = script.get("panels") if isinstance(script, dict) else []
    if not isinstance(panels, list) or not panels:
        return _fallback_page(cluster, "this concept")

    assembled = []
    used_characters = set()
    for index, panel in enumerate(panels[:4]):
        panel = panel if isinstance(panel, dict) else {}
        requested_character = panel.get("character")
        fallback_character = next(
            (candidate for candidate in roster["characters"] if candidate not in used_characters),
            roster["characters"][index % len(roster["characters"])],
        )
        character = (
            requested_character
            if requested_character in roster["characters"] and requested_character not in used_characters
            else fallback_character
        )
        used_characters.add(character)
        background = panel.get("background") if panel.get("background") in roster["backgrounds"] else roster["backgrounds"][index % len(roster["backgrounds"])]
        pose = panel.get("pose") if panel.get("pose") in {"default", "action", "thinking", "pointing"} else "default"
        dialogue = str(panel.get("dialogue") or "Let’s take this step together.")[:420]
        action = str(panel.get("action") or roster["actions"][index % len(roster["actions"])])[:45]
        caption = str(panel.get("caption") or f"{roster['name'].upper()} LEARNS")[:80]
        profile = CHARACTER_PROFILES[character]
        panel_html = build_comic_canvas(cluster, character, background, pose)
        panel_html = (panel_html
            .replace("{{DIALOGUE}}", html.escape(dialogue))
            .replace("{{ACTION}}", html.escape(action))
            .replace("{{CAPTION}}", html.escape(caption)))
        assembled.append({
            "character": character,
            "character_name": profile["name"],
            "character_gender": profile["gender"],
            "background": background,
            "pose": pose,
            "dialogue": dialogue,
            "action": action,
            "html": panel_html,
        })

    return {
        "cluster": cluster,
        "title": str(script.get("title") or roster["name"])[:100],
        "css_bundle": "original-comics.css",
        "is_finished": bool(script.get("is_finished", True)),
        "panels": assembled,
    }


def _fallback_page(cluster: str, concept: str) -> dict:
    cluster = resolve_cluster(cluster)
    roster = CLUSTER_ROSTER[cluster]
    script = {
        "title": f"Learning {concept}",
        "is_finished": True,
        "panels": [{
            "character": roster["characters"][0],
            "background": roster["backgrounds"][0],
            "pose": "default",
            "dialogue": f"Let’s explore {concept}, one useful step at a time.",
            "action": roster["actions"][0],
            "caption": "LET’S LEARN",
        }],
    }
    # This helper is only reached on a failed model request, so use the same
    # local builder synchronously to preserve a usable, colourful experience.
    from app.db.canvas_library import build_comic_canvas
    panel = script["panels"][0]
    profile = CHARACTER_PROFILES[panel["character"]]
    comic_html = build_comic_canvas(cluster, panel["character"], panel["background"], panel["pose"])
    comic_html = (comic_html
        .replace("{{DIALOGUE}}", html.escape(panel["dialogue"]))
        .replace("{{ACTION}}", html.escape(panel["action"]))
        .replace("{{CAPTION}}", panel["caption"]))
    return {
        "cluster": cluster,
        "title": script["title"],
        "css_bundle": "original-comics.css",
        "is_finished": True,
        "panels": [{
            **panel,
            "character_name": profile["name"],
            "character_gender": profile["gender"],
            "html": comic_html,
        }],
    }
