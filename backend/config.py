from pathlib import Path
import tempfile


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
