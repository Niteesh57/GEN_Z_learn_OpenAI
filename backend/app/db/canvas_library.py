"""
Canvas Library — defines all canvas HTML templates for each cluster.
Each canvas = (character, background, pose) triple with a pre-built HTML block.
DIALOGUE and ACTION are placeholders injected at generation time.
"""

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def dc_hero_html(character: str, background: str, pose: str) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="speech-bubble" style="top:15px;left:15px;">{{{{DIALOGUE}}}}</div>
  <div class="dc-hero {character}">
    <div class="hair-bg"></div>
    <div class="feature left"></div><div class="feature right"></div>
    <div class="head">
      <div class="hair"></div><div class="curl"></div><div class="tiara"></div>
      <div class="eyes"><div class="eye left"></div><div class="eye right"></div></div>
      <div class="jaw"></div><div class="mouth"></div>
    </div>
    <div class="body"></div>
  </div>
  <div class="action-text">{{{{ACTION}}}}</div>
</div>"""

def marvel_hero_html(character: str, background: str, pose: str) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="speech-bubble">{{{{DIALOGUE}}}}</div>
  <div class="mashup-hero {character}">
    <div class="feature left"></div><div class="feature right"></div>
    <div class="head">
      <div class="eyes"><div class="eye left"></div><div class="eye right"></div></div>
      <div class="mouth"></div>
    </div>
    <div class="body"></div>
  </div>
  <div class="action-text">{{{{ACTION}}}}</div>
</div>"""

def disney_hero_html(character: str, background: str, pose: str) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="speech-bubble">{{{{DIALOGUE}}}}</div>
  <div class="disney-hero {character}">
    <div class="ear left"></div><div class="ear right"></div>
    <div class="hat"></div><div class="bow"></div>
    <div class="head">
      <div class="snout"></div><div class="beak"></div>
      <div class="eyes"><div class="eye left"></div><div class="eye right"></div></div>
      <div class="mouth"></div>
    </div>
    <div class="body"></div>
  </div>
  <div class="action-text">{{{{ACTION}}}}</div>
</div>"""

def tj_hero_html(character: str, background: str, pose: str) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="speech-bubble">{{{{DIALOGUE}}}}</div>
  <div class="tj-hero {character}">
    <div class="ear left"></div><div class="ear right"></div>
    <div class="head">
      <div class="snout"></div><div class="nose"></div><div class="jowl"></div>
      <div class="eyes"><div class="eye left"></div><div class="eye right"></div></div>
      <div class="mouth"></div>
    </div>
    <div class="collar"></div><div class="diaper"></div>
    <div class="body"></div>
  </div>
  <div class="action-text">{{{{ACTION}}}}</div>
</div>"""

def kb_hero_html(character: str, background: str, pose: str) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="speech-bubble">{{{{DIALOGUE}}}}</div>
  <div class="kb-hero {character}">
    <div class="hair"></div><div class="headband"></div>
    <div class="helmet"></div><div class="horns"></div>
    <div class="head">
      <div class="eyes"><div class="eye left"></div><div class="eye right"></div></div>
      <div class="mouth"></div>
    </div>
    <div class="jaw"></div>
    <div class="body"></div>
  </div>
  <div class="action-text">{{{{ACTION}}}}</div>
</div>"""

def st_hero_html(character: str, background: str, pose: str) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="speech-bubble">{{{{DIALOGUE}}}}</div>
  <div class="st-hero {character}">
    <div class="hat"></div><div class="hair"></div><div class="blood"></div>
    <div class="petals"></div><div class="accessory"></div>
    <div class="head">
      <div class="eyes"><div class="eye left"></div><div class="eye right"></div></div>
      <div class="mouth"></div>
    </div>
    <div class="body"></div>
  </div>
  <div class="action-text">{{{{ACTION}}}}</div>
</div>"""

def ben10_hero_html(character: str, background: str, pose: str) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="speech-bubble" style="top:15px;left:15px;">{{{{DIALOGUE}}}}</div>
  <div class="alien-hero {character}">
    <div class="alien-head">
      <div class="alien-eyes"><div class="alien-eye left"></div><div class="alien-eye right"></div></div>
    </div>
    <div class="alien-body"></div>
  </div>
  <div class="action-text" style="bottom:20px;right:15px;">{{{{ACTION}}}}</div>
</div>"""

def glitch_hero_html(background: str, pose: str, panel_num: int) -> str:
    return f"""<div class="comic-card {background} pose-{pose}">
  <div class="caption-box">{{{{CAPTION}}}}</div>
  <div class="speech-bubble" style="top:80px;right:15px;">{{{{DIALOGUE}}}}</div>
  <canvas id="glitch-canvas-{panel_num}" class="panel-canvas"></canvas>
  <div class="sfx-text" style="bottom:40px;left:35%;font-size:28px;">{{{{ACTION}}}}</div>
</div>"""

# ─────────────────────────────────────────────────────────────────────────────
# CANVAS DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

def build_all_canvases():
    canvases = []

    # ── DC Justice ────────────────────────────────────────────────────────────
    dc_chars = [
        ("batman", "dark knight of Gotham fighting crime at night"),
        ("superman", "Man of Steel flying above Metropolis"),
        ("flash", "speedster running at light speed"),
        ("wonderwoman", "Amazon warrior protecting justice"),
    ]
    dc_bgs = ["bg-gotham", "bg-metropolis", "bg-speedforce", "bg-themyscira"]
    poses = ["default", "action", "thinking", "pointing"]
    pose_descriptions = ["standing", "in action pose", "thinking and contemplating", "pointing dramatically"]
    for char, char_desc in dc_chars:
        for bg in dc_bgs:
            for pose, pdesc in zip(poses, pose_descriptions):
                canvas_id = f"dc_justice-{char}-{bg}-{pose}"
                canvases.append({
                    "id": canvas_id,
                    "description": f"{char_desc} in {bg.replace('bg-','')} background, {pdesc}",
                    "cluster": "dc_justice",
                    "character": char,
                    "background": bg,
                    "pose": pose,
                    "css_bundle": "dc_justice.css",
                    "canvas_html": dc_hero_html(char, bg, pose)
                })

    # ── Marvel Mashup ─────────────────────────────────────────────────────────
    marvel_chars = [
        ("bat-spider", "half Batman half Spider-Man mashup hero swinging through city"),
        ("iron-bat", "Iron Man Batman fusion with tech armor"),
        ("smash-dash", "Hulk Flash combination speeding and smashing"),
        ("skull-claw", "Ghost Rider Wolverine hybrid with claws and flames"),
    ]
    marvel_bgs = ["bg-1", "bg-2", "bg-3", "bg-4"]
    bg_descs = ["clean white studio", "explosive yellow action dots", "soft gradient pastel", "dark dramatic black"]
    for char, char_desc in marvel_chars:
        for bg, bg_desc in zip(marvel_bgs, bg_descs):
            for pose, pdesc in zip(poses, pose_descriptions):
                canvas_id = f"marvel_mashup-{char}-{bg}-{pose}"
                canvases.append({
                    "id": canvas_id,
                    "description": f"{char_desc} in {bg_desc} background, {pdesc}",
                    "cluster": "marvel_mashup",
                    "character": char,
                    "background": bg,
                    "pose": pose,
                    "css_bundle": "marvel_mashup.css",
                    "canvas_html": marvel_hero_html(char, bg, pose)
                })

    # ── Disney Classic ────────────────────────────────────────────────────────
    disney_chars = [
        ("mickey", "Mickey Mouse cheerful and energetic in Toontown"),
        ("minnie", "Minnie Mouse sweet and fashionable"),
        ("donald", "Donald Duck grumpy but lovable sailor"),
        ("goofy", "Goofy tall clumsy lovable friend"),
    ]
    disney_bgs = ["bg-toontown", "bg-steamboat", "bg-clubhouse", "bg-magic"]
    for char, char_desc in disney_chars:
        for bg in disney_bgs:
            for pose, pdesc in zip(poses, pose_descriptions):
                canvas_id = f"disney-{char}-{bg}-{pose}"
                canvases.append({
                    "id": canvas_id,
                    "description": f"{char_desc}, {bg.replace('bg-','')} scene, {pdesc}",
                    "cluster": "disney",
                    "character": char,
                    "background": bg,
                    "pose": pose,
                    "css_bundle": "disney.css",
                    "canvas_html": disney_hero_html(char, bg, pose)
                })

    # ── Tom & Jerry ───────────────────────────────────────────────────────────
    tj_chars = [
        ("tom", "Tom the grey cat scheming and chasing"),
        ("jerry", "Jerry the clever brown mouse outsmarting Tom"),
        ("spike", "Spike the tough bulldog protecting the yard"),
        ("nibbles", "Nibbles tiny baby mouse adorable and small"),
    ]
    tj_bgs = ["bg-kitchen", "bg-livingroom", "bg-yard", "bg-mousehole"]
    for char, char_desc in tj_chars:
        for bg in tj_bgs:
            for pose, pdesc in zip(poses, pose_descriptions):
                canvas_id = f"tom_jerry-{char}-{bg}-{pose}"
                canvases.append({
                    "id": canvas_id,
                    "description": f"{char_desc} in {bg.replace('bg-','')} setting, {pdesc}",
                    "cluster": "tom_jerry",
                    "character": char,
                    "background": bg,
                    "pose": pose,
                    "css_bundle": "tom_jerry.css",
                    "canvas_html": tj_hero_html(char, bg, pose)
                })

    # ── Kick Buttowski ────────────────────────────────────────────────────────
    kb_chars = [
        ("kick", "Kick Buttowski daredevil stuntman in white helmet"),
        ("gunther", "Gunther big Viking best friend with horned helmet"),
        ("kendall", "Kendall smart overachiever with yellow headband"),
        ("brad", "Brad bully older brother with square chin"),
    ]
    kb_bgs = ["bg-gully", "bg-neighborhood", "bg-garage", "bg-hurtsmore"]
    for char, char_desc in kb_chars:
        for bg in kb_bgs:
            for pose, pdesc in zip(poses, pose_descriptions):
                canvas_id = f"kick_buttowski-{char}-{bg}-{pose}"
                canvases.append({
                    "id": canvas_id,
                    "description": f"{char_desc} in {bg.replace('bg-','')} setting, {pdesc}",
                    "cluster": "kick_buttowski",
                    "character": char,
                    "background": bg,
                    "pose": pose,
                    "css_bundle": "kick_buttowski.css",
                    "canvas_html": kb_hero_html(char, bg, pose)
                })

    # ── Stranger Things ───────────────────────────────────────────────────────
    st_chars = [
        ("eleven", "Eleven with telekinetic powers and nosebleed"),
        ("dustin", "Dustin with curly hair and trucker hat gap tooth smile"),
        ("hopper", "Chief Hopper gruff sheriff with wide brim hat and mustache"),
        ("demogorgon", "Demogorgon terrifying monster with flower petal face"),
    ]
    st_bgs = ["bg-upsidedown", "bg-lab", "bg-basement", "bg-hawkins"]
    for char, char_desc in st_chars:
        for bg in st_bgs:
            for pose, pdesc in zip(poses, pose_descriptions):
                canvas_id = f"stranger_things-{char}-{bg}-{pose}"
                canvases.append({
                    "id": canvas_id,
                    "description": f"{char_desc} in {bg.replace('bg-','')} setting, {pdesc}",
                    "cluster": "stranger_things",
                    "character": char,
                    "background": bg,
                    "pose": pose,
                    "css_bundle": "stranger_things.css",
                    "canvas_html": st_hero_html(char, bg, pose)
                })

    # ── Ben10 ─────────────────────────────────────────────────────────────────
    ben10_chars = [
        ("heatblast", "Heatblast fire alien with burning orange body and glowing eyes"),
        ("diamondhead", "Diamondhead crystal alien with hexagon body and geometric eyes"),
        ("xlr8", "XLR8 super speed alien with blue body and cyan visor eyes"),
        ("upgrade", "Upgrade techno alien black with green circuit pattern eyes"),
    ]
    ben10_bgs = ["bg-alien-city", "bg-space", "bg-omnitrix", "bg-desert"]
    for char, char_desc in ben10_chars:
        for bg in ben10_bgs:
            for pose, pdesc in zip(poses, pose_descriptions):
                canvas_id = f"ben10-{char}-{bg}-{pose}"
                canvases.append({
                    "id": canvas_id,
                    "description": f"{char_desc} in {bg.replace('bg-','')} setting, {pdesc}",
                    "cluster": "ben10",
                    "character": char,
                    "background": bg,
                    "pose": pose,
                    "css_bundle": "ben10.css",
                    "canvas_html": ben10_hero_html(char, bg, pose)
                })

    # ── Glitch Rider (Cyberpunk Pixel Art) ───────────────────────────────────
    glitch_bgs = ["bg-neotokyo", "bg-matrix", "bg-circuit", "bg-void"]
    bg_descriptions = {
        "bg-neotokyo": "neon cyberpunk city night with pink and cyan dots",
        "bg-matrix": "falling green matrix code lines",
        "bg-circuit": "glowing cyan circuit board grid",
        "bg-void": "dark radial void gradient",
    }
    for i, bg in enumerate(glitch_bgs):
        for pose, pdesc in zip(poses, pose_descriptions):
            canvas_id = f"glitch_rider-pixel-{bg}-{pose}"
            canvases.append({
                "id": canvas_id,
                "description": f"Cyberpunk pixel art hacker character in {bg_descriptions[bg]}, {pdesc}",
                "cluster": "glitch_rider",
                "character": "pixel_hacker",
                "background": bg,
                "pose": pose,
                "css_bundle": "glitch_rider.css",
                "canvas_html": glitch_hero_html(bg, pose, i + 1)
            })

    return canvases


ALL_CANVASES = build_all_canvases()
