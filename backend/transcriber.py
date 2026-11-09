from pathlib import Path

import httpx
from fastapi import HTTPException

from config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_LANGUAGE,
    GROQ_TRANSCRIPTION_URL,
    GROQ_MAX_UPLOAD_BYTES,
)


def ensure_groq_configured() -> None:
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "Transcribing Instagram reels needs a Groq API key. "
                "Add GROQ_API_KEY=... to backend/.env and restart the backend."
            ),
        )


def _groq_error_message(response: httpx.Response) -> str:
    """Pull Groq's own error text out of a failed response, if it has any."""
    try:
        message = response.json().get("error", {}).get("message")
    except ValueError:
        message = None
    return (message or response.text or "no details").strip()[:300]


async def transcribe_with_groq(audio_path: Path) -> str:
    """Send an audio file to Groq's hosted Whisper and return the text."""
    ensure_groq_configured()

    if audio_path.stat().st_size > GROQ_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="This audio is too long for Groq's 25 MB free-tier upload limit.",
        )

    form = {"model": GROQ_MODEL, "response_format": "json", "temperature": "0"}
    if GROQ_LANGUAGE:
        form["language"] = GROQ_LANGUAGE

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            response = await client.post(
                GROQ_TRANSCRIPTION_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                data=form,
                files={"file": (audio_path.name, audio_path.read_bytes(), "audio/mpeg")},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Groq took too long to respond. Try again.")
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Could not reach Groq. Check your internet connection.",
        )

    if response.status_code == 401:
        raise HTTPException(
            status_code=502,
            detail="Groq rejected the API key. Check GROQ_API_KEY in backend/.env.",
        )
    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="Groq's free-tier rate limit was reached. Wait a bit and try again.",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Groq error ({response.status_code}): {_groq_error_message(response)}",
        )

    text = (response.json().get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=404, detail="No speech was detected in this reel.")

    return text
