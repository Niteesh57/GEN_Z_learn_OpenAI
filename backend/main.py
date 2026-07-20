import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.agents.comic_agent import CLUSTER_ROSTER, generate_next_comic_page
from app.graph.workflow import app_graph

load_dotenv()

app = FastAPI(title="The way Gen_Z learn's API")


@app.on_event("startup")
async def startup_event():
    """Load local original comic canvases; no remote template index is used."""
    from app.db.canvas_library import ALL_CANVASES
    print(f"[Startup] Loaded {len(ALL_CANVASES)} original comic canvases.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    concept: str
    medium: Optional[str] = None
    template: Optional[str] = None
    active_folder: Optional[str] = None


async def generate_experience(request: GenerateRequest):
    state = {
        "concept": request.concept,
        "selected_medium": request.medium,
        "selected_template": request.template,
        "router_decision": None,
        "template": None,
        "title": None,
        "description": None,
        "content": None,
    }
    folder = request.active_folder or request.medium
    if folder == "COMIC":
        from app.agents.comic_agent import generate_comic
        result = await generate_comic(state)
    elif folder == "GIF_LEARNING":
        from app.agents.giphy_agent import generate_giphy_learning
        result = await generate_giphy_learning(state)
    elif folder == "REELS":
        from app.agents.reels_agent import generate_reels
        result = await generate_reels(state)
    else:
        result = await app_graph.ainvoke(state)

    return {
        "medium": result.get("router_decision") or folder,
        "template": result.get("template"),
        "title": result.get("title"),
        "description": result.get("description"),
        "content": result.get("content"),
    }


@app.post("/generate")
async def generate_endpoint(request: GenerateRequest):
    return await generate_experience(request)


class ComicPageRequest(BaseModel):
    concept: str
    cluster: str
    page_num: int = 2
    story_so_far: str = ""


@app.post("/generate-comic-page")
async def generate_comic_page_endpoint(request: ComicPageRequest):
    return await generate_next_comic_page(
        request.concept, request.cluster, request.page_num, request.story_so_far
    )


COMIC_COLORS = {
    "byte_hero": "#5b4bff", "pixel_bot": "#007f82", "nova_alien": "#6f35c8",
    "fox_genius": "#e66130", "professor_panda": "#176b54", "wise_owl": "#8a4d20",
    "captain_cloud": "#1877c9", "code_dragon": "#ba2c5c", "hero_verse": "#5b4bff",
    "super_squad": "#176b54", "fairy_tales": "#bb4e91", "cat_vs_mouse": "#de6b37",
    "alien_morph": "#6f35c8", "mystery_town": "#8a4d20", "stunt_rider": "#e04f21",
    "cyber_runner": "#007f82", "superhero_universe": "#5b4bff", "fantasy_kingdom": "#bb4e91",
    "robot_academy": "#007f82", "alien_adventures": "#6f35c8", "mystery_detectives": "#8a4d20",
    "pirate_legends": "#176b54", "space_explorers": "#1877c9", "ninja_academy": "#ba2c5c",
}


@app.get("/comic-clusters")
def get_comic_clusters():
    return {
        "clusters": [
            {
                "id": key,
                "name": roster["name"],
                "description": roster["description"],
                "emoji": roster["emoji"],
                "color": COMIC_COLORS.get(key, "#555"),
                "characters": roster["characters"],
            }
            for key, roster in CLUSTER_ROSTER.items()
        ]
    }


# Serve the built React app when it is available.
frontend_dist_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_dist_path):
    assets_path = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/favicon.svg")
    async def serve_favicon():
        favicon_path = os.path.join(frontend_dist_path, "favicon.svg")
        return FileResponse(favicon_path) if os.path.exists(favicon_path) else {"message": "Favicon not found"}

    @app.get("/icons.svg")
    async def serve_icons():
        icons_path = os.path.join(frontend_dist_path, "icons.svg")
        return FileResponse(icons_path) if os.path.exists(icons_path) else {"message": "Icons not found"}

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        file_path = os.path.join(frontend_dist_path, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Welcome to The way Gen_Z learn's API (Static assets not compiled)"}
