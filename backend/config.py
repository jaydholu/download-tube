from pathlib import Path
import tempfile


MAX_FILE_SIZE_MB = 450
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "downloadtube"
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Instagram requires an authenticated session for reliable access.
# On Render this is supplied as a Secret File (uploaded via the dashboard).
# Locally, drop a `instagram_cookies.txt` file next to this one for the same effect.
INSTAGRAM_COOKIES_PATH = Path("/etc/secrets/instagram_cookies.txt")
LOCAL_INSTAGRAM_COOKIES_PATH = Path(__file__).parent / "instagram_cookies.txt"

VIDEO_QUALITIES = ["1080", "720", "480", "360", "240", "144"]
AUDIO_QUALITIES = ["320", "256", "192", "128", "64", "32"]

YTDLP_COMMON_FLAGS = [
    "--extractor-args", "youtube:player_client=tv,ios,android",
    "--no-check-certificates",
    "--no-warnings",
]
