import os
import sys
import asyncio
import shutil
import time
import uuid
from pathlib import Path

# Windows asyncio fix
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import DOWNLOAD_DIR, MAX_FILE_SIZE_MB
from models import DownloadRequest, VideoInfoRequest
from downloader import active_downloads, get_video_info, download_media, fetch_transcript
from utils import cleanup_task_files


app = FastAPI(title="DownloadTube API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok", "max_size_mb": MAX_FILE_SIZE_MB}


@app.post("/api/info")
async def video_info(req: VideoInfoRequest):
    info = await get_video_info(req.url)
    formats = info.get("formats", [])
    available_heights = sorted(
        set(
            f.get("height")
            for f in formats
            if f.get("height") and f.get("vcodec") != "none"
        ),
        reverse=True,
    )
    return {
        "title": info.get("title", "Unknown"),
        "channel": info.get("channel", info.get("uploader", "Unknown")),
        "duration": info.get("duration", 0),
        "thumbnail": info.get("thumbnail", ""),
        "view_count": info.get("view_count", 0),
        "description": info.get("description", "")[:500],
        "available_qualities": [str(h) for h in available_heights if h],
    }


@app.post("/api/download")
async def start_download(req: DownloadRequest):
    task_id = str(uuid.uuid4())[:8]
    active_downloads[task_id] = {"status": "starting", "format": req.format}
    asyncio.create_task(
        download_media(req.url, req.format, req.quality, task_id)
    )
    return {"task_id": task_id}


@app.get("/api/status/{task_id}")
async def download_status(task_id: str):
    if task_id not in active_downloads:
        raise HTTPException(status_code=404, detail="Task not found")
    return active_downloads[task_id]


@app.get("/api/file/{task_id}")
async def get_file(task_id: str):
    if task_id not in active_downloads:
        raise HTTPException(status_code=404, detail="Task not found")

    task = active_downloads[task_id]
    if task.get("status") != "complete":
        raise HTTPException(status_code=400, detail="Download not complete")

    filepath = task.get("filepath")
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    fmt = task["format"]
    ext = ".mp4" if fmt == "mp4" else ".mp3"
    media_type = "video/mp4" if fmt == "mp4" else "audio/mpeg"

    filename = task.get("filename", f"download{ext}")
    if not filename.lower().endswith(ext):
        filename = filename.rsplit(".", 1)[0] + ext

    task["served_at"] = time.time()

    return FileResponse(
        filepath,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/transcript")
async def get_transcript(req: VideoInfoRequest):
    transcript = await fetch_transcript(req.url)
    return {"transcript": transcript}


# ---------------------------------------------------------------------------
# Static frontend (production build)
# ---------------------------------------------------------------------------

STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))


# ---------------------------------------------------------------------------
# Startup / cleanup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_cleanup():
    if DOWNLOAD_DIR.exists():
        for item in DOWNLOAD_DIR.iterdir():
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
    asyncio.create_task(_periodic_cleanup())


async def _periodic_cleanup():
    """Every 60 s, delete files served more than 5 minutes ago."""
    while True:
        await asyncio.sleep(60)
        now = time.time()
        expired = [
            tid for tid, task in active_downloads.items()
            if task.get("served_at") and (now - task["served_at"]) > 300
        ]
        for tid in expired:
            cleanup_task_files(tid)
            active_downloads.pop(tid, None)
