"""Local, original CSS canvases for the comic learning mode.

This module intentionally contains no franchise names or remote lookups.  A
screenplay can only choose from the template data in ``comic_agent``; it is
then rendered into one of these predictable HTML shells.
"""
from html import escape

from app.db.comic_characters import CHARACTER_PROFILES


def build_comic_canvas(cluster: str, character: str, background: str, pose: str) -> str:
    """Return a fixed canvas with slots for safely escaped screenplay text."""
    profile = CHARACTER_PROFILES.get(character, {"name": "Learning Guide", "emoji": "✨"})
    mark = profile["emoji"]
    display_name = escape(profile["name"])
    safe_cluster = escape(cluster)
    safe_character = escape(character)
    safe_background = escape(background)
    safe_pose = escape(pose)
    return f"""
<article class="original-comic-panel comic-template-{safe_cluster} {safe_background} pose-{safe_pose}" data-template="{safe_cluster}">
  <div class="original-comic-grain"></div>
  <div class="original-comic-orb orb-one"></div>
  <div class="original-comic-orb orb-two"></div>
  <div class="original-comic-route route-one"></div>
  <div class="original-comic-route route-two"></div>
  <div class="original-comic-caption">{{{{CAPTION}}}}</div>
  <div class="original-comic-mascot mascot-{safe_character}" aria-label="{safe_character}">
    <span class="original-comic-mark">{mark}</span>
    <span class="original-comic-shadow"></span>
  </div>
  <div class="original-comic-character-name">{display_name}</div>
  <div class="original-comic-speech">{{{{DIALOGUE}}}}</div>
  <div class="original-comic-action">{{{{ACTION}}}}</div>
  <div class="original-comic-dots">• • •</div>
</article>
""".strip()


def _build_all_canvases() -> list[dict]:
    # Import here to prevent an import cycle: the agent imports this module
    # while the roster remains the source of template choices.
    from app.agents.comic_agent import CLUSTER_ROSTER

    canvases = []
    for cluster, roster in CLUSTER_ROSTER.items():
        for character in roster["characters"]:
            for background in roster["backgrounds"]:
                for pose in ("default", "action", "thinking", "pointing"):
                    canvases.append({
                        "canvas_id": f"{cluster}-{character}-{background}-{pose}",
                        "cluster": cluster,
                        "character": character,
                        "background": background,
                        "pose": pose,
                        "description": f"Original {roster['name']} comic canvas: {character}, {background}, {pose}",
                        "css_bundle": "original-comics.css",
                        "canvas_html": build_comic_canvas(cluster, character, background, pose),
                    })
    return canvases


ALL_CANVASES = _build_all_canvases()
