from pydantic import BaseModel, field_validator
from utils import detect_platform


class DownloadRequest(BaseModel):
    url: str
    format: str = "mp4"
    quality: str | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v):
        if not detect_platform(v):
            raise ValueError("Invalid YouTube or Instagram URL")
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
        if not detect_platform(v):
            raise ValueError("Invalid YouTube or Instagram URL")
        return v
