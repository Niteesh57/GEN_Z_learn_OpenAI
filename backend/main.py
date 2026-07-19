from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from app.graph.workflow import app_graph
from app.agents.comic_agent import generate_next_comic_page, CLUSTER_ROSTER
from typing import Optional, Dict, Any, List

load_dotenv()

app = FastAPI(title="The way Gen_Z learn's API")

@app.on_event("startup")
async def startup_event():
    """Pre-warm the in-memory indices on startup."""
    try:
        from app.db.comic_canvas_db import ingest_canvases
        from app.db.canvas_library import ALL_CANVASES
        ingest_canvases(ALL_CANVASES)
        print("[Startup] Loaded comic canvases.")
        
    except Exception as e:
        print(f"Error during startup indexing: {e}")

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
        "content": None
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
        "content": result.get("content")
    }

@app.post("/generate")
async def generate_endpoint(request: GenerateRequest):
    result = await generate_experience(request)
    return result

class ComicPageRequest(BaseModel):
    concept: str
    cluster: str
    page_num: int = 2
    story_so_far: str = ""

@app.post("/generate-comic-page")
async def generate_comic_page_endpoint(request: ComicPageRequest):
    result = await generate_next_comic_page(
        request.concept, request.cluster, request.page_num, request.story_so_far
    )
    return result

@app.get("/comic-clusters")
def get_comic_clusters():
    clusters = []
    emoji_map = {
        "dc_justice": "🦇",
        "marvel_mashup": "🕷️",
        "disney": "🐭",
        "tom_jerry": "🐱",
        "kick_buttowski": "🛹",
        "stranger_things": "💡",
        "ben10": "👽",
        "glitch_rider": "💻",
    }
    color_map = {
        "dc_justice": "#2b1055",
        "marvel_mashup": "#ef233c",
        "disney": "#e60000",
        "tom_jerry": "#697d91",
        "kick_buttowski": "#f1c40f",
        "stranger_things": "#e50914",
        "ben10": "#39ff14",
        "glitch_rider": "#00ffff",
    }
    for key, roster in CLUSTER_ROSTER.items():
        clusters.append({
            "id": key,
            "name": key.replace("_", " ").title(),
            "description": roster["description"],
            "emoji": emoji_map.get(key, "🎨"),
            "color": color_map.get(key, "#555"),
            "characters": roster["characters"]
        })
    return {"clusters": clusters}

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve static files from the built frontend directory
frontend_dist_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_dist_path):
    # Mount assets directory for JS/CSS and other built files
    assets_path = os.path.join(frontend_dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    # Serve specific root files individually if they exist
    @app.get("/favicon.svg")
    async def serve_favicon():
        favicon_path = os.path.join(frontend_dist_path, "favicon.svg")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        return {"message": "Favicon not found"}

    @app.get("/icons.svg")
    async def serve_icons():
        icons_path = os.path.join(frontend_dist_path, "icons.svg")
        if os.path.exists(icons_path):
            return FileResponse(icons_path)
        return {"message": "Icons not found"}

    @app.get("/")
    async def serve_index():
        index_path = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Welcome to The way Gen_Z learn's API"}

    @app.get("/{catchall:path}")
    async def serve_react_app(catchall: str):
        # If the requested path is a real file in the dist directory (like dynamic CSS/images), serve it
        file_path = os.path.join(frontend_dist_path, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_path = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": f"Path not found: {catchall}"}
else:
    @app.get("/")
    def read_root():
        return {"message": "Welcome to The way Gen_Z learn's API (Static assets not compiled)"}
