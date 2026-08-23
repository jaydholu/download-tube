from pathlib import Path
import tempfile


MAX_FILE_SIZE_MB = 450
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

DOWNLOAD_DIR = Path(tempfile.gettempdir()) / "downloadtube"
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Both platforms require an authenticated session for reliable cloud access.
# On Render these are supplied as Secret Files (uploaded via the dashboard).
# Locally, drop the matching file next to this one for the same effect.
INSTAGRAM_COOKIES_PATH = Path("/etc/secrets/cookies_instagram.txt")
LOCAL_INSTAGRAM_COOKIES_PATH = Path(__file__).parent / "cookies_instagram.txt"

# YouTube doesn't strictly need cookies from a residential IP, but from a
# datacenter IP (Render) its bot detection routinely blocks anonymous
# requests even with a PO token provider running — see downloader.py.
YOUTUBE_COOKIES_PATH = Path("/etc/secrets/cookies_youtube.txt")
LOCAL_YOUTUBE_COOKIES_PATH = Path(__file__).parent / "cookies_youtube.txt"

VIDEO_QUALITIES = ["1080", "720", "480", "360", "240", "144"]
AUDIO_QUALITIES = ["320", "256", "192", "128", "64", "32"]

YTDLP_COMMON_FLAGS = [
    "--extractor-args", "youtube:player_client=tv,ios,android",
    "--no-check-certificates",
    "--no-warnings",
]
