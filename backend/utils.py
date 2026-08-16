import re
import asyncio
import subprocess
import shutil

from config import DOWNLOAD_DIR, INSTAGRAM_COOKIES_PATH, LOCAL_INSTAGRAM_COOKIES_PATH


def detect_platform(url: str) -> str | None:
    """Identify which extractor a URL belongs to, or None if unsupported."""
    if re.search(r"(youtube\.com|youtu\.be)", url, re.IGNORECASE):
        return "youtube"
    if re.search(r"instagram\.com/(reel|reels|p|tv)/", url, re.IGNORECASE):
        return "instagram"
    return None


def get_cookie_flags(platform: str | None) -> list[str]:
    """yt-dlp --cookies flag for platforms that need an authenticated session.

    YouTube needs nothing extra. Instagram needs a logged-in session's
    cookies to avoid anonymous rate-limiting; if no cookie file is present
    we just proceed without one (some public reels may still work).
    """
    if platform != "instagram":
        return []
    for path in (INSTAGRAM_COOKIES_PATH, LOCAL_INSTAGRAM_COOKIES_PATH):
        if path.exists():
            return ["--cookies", str(path)]
    return []


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = name.strip('. ')
    return name[:200] if name else 'download'


def cleanup_task_files(task_id: str):
    task_dir = DOWNLOAD_DIR / task_id
    if task_dir.exists():
        shutil.rmtree(task_dir, ignore_errors=True)


async def run_command(cmd: list[str]) -> tuple[bytes, bytes, int]:
    """Run a shell command asynchronously, with threaded fallback for Windows."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        # communicate() waits for the process to exit, so returncode is
        # always set here — asserted for the type checker's benefit.
        assert proc.returncode is not None
        return stdout, stderr, proc.returncode

    except NotImplementedError:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True),
        )

        return result.stdout, result.stderr, result.returncode
