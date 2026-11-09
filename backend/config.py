import os
from pathlib import Path
import tempfile

from dotenv import load_dotenv


# Reads backend/.env (gitignored) so secrets like the Groq key don't have to
# be exported again in every new terminal.
load_dotenv(Path(__file__).parent / ".env")

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

# Instagram reels have no captions to fetch, so their transcripts come from
# speech-to-text on the audio, using Groq's hosted Whisper.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3").strip()
# Optional ISO-639-1 code (e.g. "hi", "en"). Empty = let Whisper auto-detect,
# which can misjudge short Hindi/Hinglish clips — pin it if that happens.
GROQ_LANGUAGE = os.getenv("GROQ_LANGUAGE", "").strip()
GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # free-tier upload cap

VIDEO_QUALITIES = ["1080", "720", "480", "360", "240", "144"]
AUDIO_QUALITIES = ["320", "256", "192", "128", "64", "32"]

YTDLP_COMMON_FLAGS = [
    "--extractor-args", "youtube:player_client=tv,ios,android",
    "--no-check-certificates",
    "--no-warnings",
]
