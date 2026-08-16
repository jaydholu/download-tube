import re
import json
import asyncio
import subprocess
import uuid
import shutil

from fastapi import HTTPException

from config import (
    DOWNLOAD_DIR,
    VIDEO_QUALITIES,
    AUDIO_QUALITIES,
    YTDLP_COMMON_FLAGS,
    MAX_FILE_SIZE_MB,
    MAX_FILE_SIZE_BYTES,
)
from utils import sanitize_filename, run_command, detect_platform, get_cookie_flags


active_downloads: dict = {}


async def get_video_info(url: str) -> dict:
    platform = detect_platform(url)
    cookie_flags = get_cookie_flags(platform)
    cmd = [
        "yt-dlp", *YTDLP_COMMON_FLAGS, *cookie_flags,
        "-v", "--dump-json", "--no-download", "--no-playlist",
        url,
    ]
    stdout, stderr, returncode = await run_command(cmd)

    if returncode != 0:
        full_output = (
            stdout.decode(errors="ignore") + "\n" + stderr.decode(errors="ignore")
        ).strip()

        if "DRM" in full_output or "DRM protected" in full_output:
            raise HTTPException(
                status_code=400,
                detail="This video is DRM protected and cannot be downloaded.",
            )

        if platform == "instagram" and (
            "login" in full_output.lower() or "rate-limit" in full_output.lower()
        ):
            raise HTTPException(
                status_code=400,
                detail="Instagram session expired or rate-limited — cookies need refreshing.",
            )

        err_lines = [
            l for l in full_output.split("\n")
            if "ERROR" in l or "pot" in l.lower() or "PO Token" in l
        ]
        err_msg = "\n".join(err_lines[-5:]) if err_lines else full_output[-400:]

        raise HTTPException(
            status_code=400,
            detail=f"yt-dlp error: {err_msg}" if err_msg else "Could not fetch video info.",
        )

    raw = stdout.decode(errors="ignore")
    json_start = raw.find('{')
    if json_start == -1:
        raise HTTPException(status_code=500, detail="No JSON in yt-dlp output")
    
    return json.loads(raw[json_start:])


async def _stream_download(cmd: list[str], task_id: str) -> int:
    """Run yt-dlp and parse progress output line-by-line in real time."""
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
                            active_downloads[task_id].update({
                                "progress": round(float(match.group(1)), 1),
                                "total_size": (match.group(2) or "").strip(),
                                "speed": (match.group(3) or "").strip(),
                                "eta": (match.group(4) or "").strip(),
                            })
                        elif "[Merger]" in line or "[ExtractAudio]" in line:
                            active_downloads[task_id].update({
                                "progress": 100,
                                "speed": "",
                                "eta": "processing...",
                            })

        await asyncio.gather(read_stream(proc.stdout), read_stream(proc.stderr))
        await proc.wait()

        # By this point the process has exited, so returncode is always set —
        # this assertion just makes that guarantee explicit for the type
        # checker (Popen/Process type returncode as int | None since it CAN
        # be unset before wait()/communicate() completes).
        assert proc.returncode is not None
        return proc.returncode

    except NotImplementedError:
        # Windows fallback
        loop = asyncio.get_running_loop()

        def _run_with_progress():
            p = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                bufsize=0,
            )
            assert p.stdout is not None  # guaranteed by stdout=PIPE above
            stdout = p.stdout  # local var narrows more reliably than p.stdout inside the lambda below

            for raw_line in iter(lambda: stdout.readline(), b""):
                line = raw_line.decode(errors="ignore").strip()
                if line:
                    match = progress_pattern.search(line)
                    if match:
                        active_downloads[task_id].update({
                            "progress": round(float(match.group(1)), 1),
                            "total_size": (match.group(2) or "").strip(),
                            "speed": (match.group(3) or "").strip(),
                            "eta": (match.group(4) or "").strip(),
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

    platform = detect_platform(url)
    cookie_flags = get_cookie_flags(platform)

    qualities = VIDEO_QUALITIES if format_type == "mp4" else AUDIO_QUALITIES

    if quality and quality != "auto" and quality in qualities:
        qualities = qualities[qualities.index(quality):]

    ext = ".mp4" if format_type == "mp4" else ".mp3"

    for q in qualities:
        # Clear previous attempt files
        for f in task_dir.iterdir():
            f.unlink()

        output_template = str(task_dir / "%(title)s.%(ext)s")

        if format_type == "mp4":
            format_spec = f"bestvideo[height<={q}]+bestaudio/best[height<={q}]/best"
            cmd = [
                "yt-dlp", *YTDLP_COMMON_FLAGS, *cookie_flags,
                "-f", format_spec,
                "--merge-output-format", "mp4",
                "--no-playlist", "--no-overwrites", "--newline",
                "-o", output_template, url,
            ]
        else:
            cmd = [
                "yt-dlp", *YTDLP_COMMON_FLAGS, *cookie_flags,
                "-x", "--audio-format", "mp3",
                "--audio-quality", f"{q}K",
                "--embed-metadata", "--embed-thumbnail",
                # Real artist/album (only populated for officially licensed
                # Content-ID music videos) win when present; otherwise fall
                # back to creator/uploader — never overwrites genuine data.
                "--parse-metadata", "%(artist,creator,uploader)s:%(meta_artist)s",
                "--parse-metadata", "%(album,creator,uploader)s:%(meta_album)s",
                "--no-playlist", "--no-overwrites", "--newline",
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

        returncode = await _stream_download(cmd, task_id)
        if returncode != 0:
            continue

        files = list(task_dir.iterdir())
        if not files:
            continue

        filepath = files[0]
        file_size = filepath.stat().st_size

        if file_size > MAX_FILE_SIZE_BYTES:
            filepath.unlink()
            continue

        quality_label = f"{q}p" if format_type == "mp4" else f"{q}kbps"

        # Ensure correct extension regardless of what yt-dlp named the file
        stem = sanitize_filename(filepath.stem)
        correct_name = stem + ext
        correct_path = task_dir / correct_name
        if filepath != correct_path:
            filepath.rename(correct_path)
            filepath = correct_path

        active_downloads[task_id] = {
            "status": "complete",
            "quality": quality_label,
            "format": format_type,
            "filename": correct_name,
            "filepath": str(filepath),
            "size_mb": round(file_size / (1024 * 1024), 2),
        }

        return active_downloads[task_id]

    active_downloads[task_id] = {
        "status": "failed",
        "error": f"File exceeds {MAX_FILE_SIZE_MB} MB even at lowest quality. Try a shorter video.",
    }

    return active_downloads[task_id]


async def fetch_transcript(url: str) -> str:
    """Download VTT subtitle and return clean plain-text transcript."""
    task_dir = DOWNLOAD_DIR / f"transcript_{uuid.uuid4().hex[:8]}"
    task_dir.mkdir(exist_ok=True)

    cookie_flags = get_cookie_flags(detect_platform(url))
    cmd = [
        "yt-dlp", *YTDLP_COMMON_FLAGS, *cookie_flags,
        "--write-auto-sub", "--sub-lang", "en",
        "--skip-download", "--sub-format", "vtt",
        "-o", str(task_dir / "%(title)s.%(ext)s"),
        "--no-playlist", url,
    ]

    await run_command(cmd)

    sub_files = list(task_dir.glob("*.vtt"))
    if not sub_files:
        shutil.rmtree(task_dir, ignore_errors=True)
        raise HTTPException(
            status_code=404,
            detail="No English transcript available for this video",
        )

    content = sub_files[0].read_text(encoding="utf-8", errors="ignore")
    lines = content.split("\n")
    transcript_lines = []
    seen = set()

    for line in lines:
        line = line.strip()

        if not line:
            continue

        if line.startswith(("WEBVTT", "Kind:", "Language:")):
            continue

        if re.match(r"^\d{2}:\d{2}", line) or re.match(r"^[\d\-]+$", line):
            continue
        
        clean = re.sub(r"<[^>]+>", "", line)
        if clean and clean not in seen:
            seen.add(clean)
            transcript_lines.append(clean)

    shutil.rmtree(task_dir, ignore_errors=True)

    return " ".join(transcript_lines)
