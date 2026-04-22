import os
import sys
import re
import uuid
import asyncio
import json
import tempfile
import shutil
import subprocess
from pathlib import Path


if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

app = FastAPI(title="DownloadTube API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Constants ---
MAX_FILE_SIZE_MB = 450
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "downloadtube"
DOWNLOAD_DIR.mkdir(exist_ok=True)

VIDEO_QUALITIES = ["1080", "720", "480", "360", "240", "144"]
AUDIO_QUALITIES = ["320", "256", "192", "128", "64", "32"]
YTDLP_COMMON_FLAGS = [
    "--extractor-args", "youtube:player_client=tv,ios,android",
    "--no-check-certificates",
    "--no-warnings",
]

active_downloads: dict = {}


# --- Models ---
class DownloadRequest(BaseModel):
    url: str
    format: str = "mp4"
    quality: str | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        yt_pattern = r"(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+"
        if not re.match(yt_pattern, v):
            raise ValueError("Invalid YouTube URL")
        return v

    @field_validator("format")
    @classmethod
    def validate_format(cls, v):
        if v not in ("mp4", "mp3"):
            raise ValueError("Format must be mp4 or mp3")
        return v


class VideoInfo(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        yt_pattern = r"(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+"
        if not re.match(yt_pattern, v):
            raise ValueError("Invalid YouTube URL")
        return v


# --- Helpers ---
def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = name.strip('. ')
    return name[:200] if name else 'download'


def cleanup_task_files(task_id: str):
    task_dir = DOWNLOAD_DIR / task_id
    if task_dir.exists():
        shutil.rmtree(task_dir, ignore_errors=True)


async def run_command(cmd: list[str]) -> tuple[bytes, bytes, int]:
    """Run a shell command. Uses asyncio subprocess on Linux, threaded fallback on Windows."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        return stdout, stderr, proc.returncode
    
    except NotImplementedError:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True),
        )
        return result.stdout, result.stderr, result.returncode


async def get_video_info(url: str) -> dict:
    cmd = ["yt-dlp", *YTDLP_COMMON_FLAGS, "-v", "--dump-json", "--no-download", "--no-playlist", url]
    stdout, stderr, returncode = await run_command(cmd)

    if returncode != 0:
        full_output = (stdout.decode(errors="ignore") + "\n" + stderr.decode(errors="ignore")).strip()
        err_lines = [l for l in full_output.split("\n") if "ERROR" in l or "pot" in l.lower() or "PO Token" in l]
        err_msg = "\n".join(err_lines[-5:]) if err_lines else full_output[-400:]

        if "DRM" in full_output or "DRM protected" in full_output:
            raise HTTPException(
                status_code=400,
                detail="This video is DRM protected and cannot be downloaded."
            )

        raise HTTPException(
            status_code=400,
            detail=f"yt-dlp error: {err_msg}" if err_msg else "Could not fetch video info.",
        )
    
    raw = stdout.decode(errors="ignore")
    json_start = raw.find('{')

    if json_start == -1:
        raise HTTPException(status_code=500, detail="No JSON in yt-dlp output")
    
    return json.loads(raw[json_start:])


async def _stream_download(cmd: list[str], task_id: str, quality: str, format_type: str) -> int:
    """Run yt-dlp and parse its stdout line-by-line for real-time progress."""
    progress_pattern = re.compile(
        r"\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*\w+)"
        r"(?:\s+at\s+([\d.]+\s*\w+/s))?"
        r"(?:\s+ETA\s+(\S+))?"
    )

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        async def read_stream(stream):
            buffer = b""
            while True:
                chunk = await stream.read(256)
                if not chunk:
                    break
                buffer += chunk

                while b"\r" in buffer or b"\n" in buffer:
                    idx_r = buffer.find(b"\r")
                    idx_n = buffer.find(b"\n")

                    if idx_r == -1:
                        idx = idx_n
                    elif idx_n == -1:
                        idx = idx_r
                    else:
                        idx = min(idx_r, idx_n)

                    line = buffer[:idx].decode(errors="ignore").strip()
                    buffer = buffer[idx + 1:]
                    if line:
                        match = progress_pattern.search(line)
                        if match:
                            pct = float(match.group(1))
                            total_size = match.group(2) or ""
                            speed = match.group(3) or ""
                            eta = match.group(4) or ""
                            active_downloads[task_id].update({
                                "progress": round(pct, 1),
                                "total_size": total_size.strip(),
                                "speed": speed.strip(),
                                "eta": eta.strip(),
                            })
                        elif "[Merger]" in line or "[ExtractAudio]" in line:
                            active_downloads[task_id].update({
                                "progress": 100,
                                "speed": "",
                                "eta": "processing...",
                            })

        await asyncio.gather(
            read_stream(proc.stdout),
            read_stream(proc.stderr),
        )
        await proc.wait()

        return proc.returncode

    except NotImplementedError:
        loop = asyncio.get_event_loop()

        def _run_with_progress():
            p = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                bufsize=0,
            )

            for raw_line in iter(lambda: p.stdout.readline(), b""):
                line = raw_line.decode(errors="ignore").strip()

                if line:
                    match = progress_pattern.search(line)
                    if match:
                        pct = float(match.group(1))
                        total_size = match.group(2) or ""
                        speed = match.group(3) or ""
                        eta = match.group(4) or ""
                        active_downloads[task_id].update({
                            "progress": round(pct, 1),
                            "total_size": total_size.strip(),
                            "speed": speed.strip(),
                            "eta": eta.strip(),
                        })
                    elif "[Merger]" in line or "[ExtractAudio]" in line:
                        active_downloads[task_id].update({
                            "progress": 100,
                            "speed": "",
                            "eta": "processing...",
                        })
            p.wait()

            return p.returncode

        return await loop.run_in_executor(None, _run_with_progress)


async def download_media(url: str, format_type: str, quality: str | None, task_id: str) -> dict:
    task_dir = DOWNLOAD_DIR / task_id
    task_dir.mkdir(exist_ok=True)

    qualities = VIDEO_QUALITIES if format_type == "mp4" else AUDIO_QUALITIES

    if quality and quality != "auto":
        if quality in qualities:
            start_idx = qualities.index(quality)
            qualities = qualities[start_idx:]

    for q in qualities:
        for f in task_dir.iterdir():
            f.unlink()

        output_template = str(task_dir / "%(title)s.%(ext)s")

        if format_type == "mp4":
            format_spec = f"bestvideo[height<={q}]+bestaudio/best[height<={q}]/best"
            cmd = [
                "yt-dlp", *YTDLP_COMMON_FLAGS,
                "-f", format_spec,
                "--merge-output-format", "mp4",
                "--no-playlist", "--no-overwrites",
                "--newline",
                "-o", output_template, url,
            ]
        else:
            cmd = [
                "yt-dlp", *YTDLP_COMMON_FLAGS,
                "-x",
                "--audio-format", "mp3",
                "--audio-quality", f"{q}K",
                "--no-playlist", "--no-overwrites",
                "--newline",
                "-o", output_template, url,
            ]

        active_downloads[task_id] = {
            "status": "downloading",
            "quality": q,
            "format": format_type,
            "progress": 0,
            "total_size": "",
            "speed": "",
            "eta": "",
        }

        returncode = await _stream_download(cmd, task_id, q, format_type)

        if returncode != 0:
            continue

        files = list(task_dir.iterdir())
        if not files:
            continue

        filepath = files[0]
        file_size = filepath.stat().st_size

        if file_size <= MAX_FILE_SIZE_BYTES:
            quality_label = f"{q}p" if format_type == "mp4" else f"{q}kbps"
            safe_name = sanitize_filename(filepath.stem) + filepath.suffix
            active_downloads[task_id] = {
                "status": "complete",
                "quality": quality_label,
                "format": format_type,
                "filename": safe_name,
                "filepath": str(filepath),
                "size_mb": round(file_size / (1024 * 1024), 2),
            }
            return active_downloads[task_id]
        else:
            filepath.unlink()
            continue

    active_downloads[task_id] = {
        "status": "failed",
        "error": f"File exceeds {MAX_FILE_SIZE_MB} MB even at lowest quality. Try a shorter video.",
    }
    return active_downloads[task_id]


# --- API Routes ---
@app.get("/api/health")
async def health():
    return {"status": "ok", "max_size_mb": MAX_FILE_SIZE_MB}


@app.post("/api/info")
async def video_info(req: VideoInfo):
    info = await get_video_info(req.url)
    formats = info.get("formats", [])
    available_heights = sorted(
        set(f.get("height") for f in formats if f.get("height") and f.get("vcodec") != "none"),
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
    asyncio.create_task(download_media(req.url, req.format, req.quality, task_id))
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

    filename = task.get("filename", "download")
    media_type = "video/mp4" if task["format"] == "mp4" else "audio/mpeg"

    import time
    task["served_at"] = time.time()

    return FileResponse(
        filepath,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/transcript")
async def get_transcript(req: VideoInfo):
    task_dir = DOWNLOAD_DIR / f"transcript_{uuid.uuid4().hex[:8]}"
    task_dir.mkdir(exist_ok=True)

    cmd = [
        "yt-dlp", *YTDLP_COMMON_FLAGS,
        "--write-auto-sub", "--sub-lang", "en",
        "--skip-download", "--sub-format", "vtt",
        "-o", str(task_dir / "%(title)s.%(ext)s"),
        "--no-playlist", req.url,
    ]

    await run_command(cmd)

    sub_files = list(task_dir.glob("*.vtt"))
    if not sub_files:
        shutil.rmtree(task_dir, ignore_errors=True)
        raise HTTPException(status_code=404, detail="No English transcript available for this video")

    content = sub_files[0].read_text(encoding="utf-8", errors="ignore")
    lines = content.split("\n")
    transcript_lines = []
    seen = set()

    for line in lines:
        line = line.strip()
        if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
            continue
        if re.match(r"^\d{2}:\d{2}", line) or re.match(r"^[\d\-]+$", line):
            continue
        clean = re.sub(r"<[^>]+>", "", line)
        if clean and clean not in seen:
            seen.add(clean)
            transcript_lines.append(clean)

    shutil.rmtree(task_dir, ignore_errors=True)
    return {"transcript": " ".join(transcript_lines)}


# --- Serve frontend static files ---
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


@app.on_event("startup")
async def startup_cleanup():
    if DOWNLOAD_DIR.exists():
        for item in DOWNLOAD_DIR.iterdir():
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)

    # Start periodic cleanup task
    asyncio.create_task(_periodic_cleanup())


async def _periodic_cleanup():
    """Every 60s, delete files that were served more than 5 minutes ago."""
    import time
    while True:
        await asyncio.sleep(60)
        now = time.time()
        expired = []

        for task_id, task in active_downloads.items():
            served_at = task.get("served_at")
            if served_at and (now - served_at) > 300:  # 5 minutes
                expired.append(task_id)

        for task_id in expired:
            cleanup_task_files(task_id)
            active_downloads.pop(task_id, None)

