import re
from pydantic import BaseModel, field_validator


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


class VideoInfoRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        yt_pattern = r"(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+"
        if not re.match(yt_pattern, v):
            raise ValueError("Invalid YouTube URL")
        return v
