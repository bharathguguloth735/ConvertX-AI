"""
DocuFlow AI — File Validation Security
"""
import hashlib
import mimetypes
import os
from pathlib import Path
from typing import Optional
try:
    import magic
except ImportError:
    magic = None

from app.config import settings

# Allowed MIME types per category
ALLOWED_PDF = {"application/pdf"}
ALLOWED_DOCUMENT = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "text/plain",
    "text/html",
    "text/markdown",
    "text/csv",
}
ALLOWED_IMAGE = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/tiff",
    "image/bmp",
}
ALLOWED_AUDIO = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
    "audio/mp4",
}
ALLOWED_VIDEO = {
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm",
    "video/mpeg",
    "video/x-ms-wmv",
}


def detect_mime_type(file_bytes: bytes, filename: str) -> str:
    """
    Detect MIME type from file content (not extension).
    Falls back to mimetypes if python-magic is unavailable.
    """
    if magic:
        try:
            mime = magic.from_buffer(file_bytes[:2048], mime=True)
            if mime:
                return mime
        except Exception:
            pass
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def is_safe_filename(filename: str) -> bool:
    """Check that the filename doesn't contain path traversal sequences."""
    return ".." not in filename and "/" not in filename and "\\" not in filename


def sanitize_filename(filename: str) -> str:
    """Return a safe version of the filename."""
    name = Path(filename).name
    safe = "".join(c for c in name if c.isalnum() or c in "._- ")
    return safe[:200] or "file"


def validate_file_size(size: int, category: str) -> bool:
    """Validate file size against configured limits."""
    limits = {
        "pdf": settings.max_pdf_size,
        "image": settings.max_image_size,
        "audio": settings.max_audio_size,
        "video": settings.max_video_size,
        "document": settings.max_doc_size,
    }
    limit = limits.get(category, settings.max_doc_size)
    return size <= limit


def get_file_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 hash of file content."""
    return hashlib.sha256(file_bytes).hexdigest()
