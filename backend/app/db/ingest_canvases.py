"""
Ingest canvas library into Microsoft Foundry IQ (Azure AI Search Index).
Run once: python -m app.db.ingest_canvases
"""
from app.db.comic_canvas_db import ingest_canvases
from app.db.canvas_library import ALL_CANVASES

if __name__ == "__main__":
    print(f"[Ingest] Starting ingestion of {len(ALL_CANVASES)} canvases...")
    ingest_canvases(ALL_CANVASES)
    print("[Ingest] Done!")
