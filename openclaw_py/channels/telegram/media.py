"""Telegram media handling utilities.

This module provides utilities for media type detection and URL loading.
"""

import filetype
import httpx
from pathlib import Path
from typing import Literal, NamedTuple

from openclaw_py.logging import log_debug, log_error

MediaKind = Literal[
    "photo",
    "video",
    "audio",
    "voice",
    "document",
    "animation",
    "sticker",
]


class LoadedMedia(NamedTuple):
    """Loaded media from URL."""

    content: bytes
    mime: str | None
    filename: str | None


def media_kind_from_mime(mime: str | None) -> MediaKind:
    """Determine media kind from MIME type.

    Args:
        mime: MIME type string

    Returns:
        Media kind for Telegram

    Examples:
        >>> media_kind_from_mime("image/jpeg")
        'photo'
        >>> media_kind_from_mime("video/mp4")
        'video'
        >>> media_kind_from_mime("audio/mpeg")
        'audio'
        >>> media_kind_from_mime("application/pdf")
        'document'
    """
    if not mime:
        return "document"

    mime_lower = mime.lower()

    if mime_lower.startswith("image/"):
        if mime_lower == "image/gif":
            return "animation"
        return "photo"

    if mime_lower.startswith("video/"):
        return "video"

    if mime_lower.startswith("audio/"):
        return "audio"

    return "document"


def is_gif_media(mime: str | None, filename: str | None = None) -> bool:
    """Check if media is a GIF.

    Args:
        mime: MIME type
        filename: Optional filename

    Returns:
        True if media is a GIF

    Examples:
        >>> is_gif_media("image/gif")
        True
        >>> is_gif_media(None, "animation.gif")
        True
        >>> is_gif_media("image/jpeg")
        False
    """
    if mime and mime.lower() == "image/gif":
        return True

    if filename and filename.lower().endswith(".gif"):
        return True

    return False


async def load_web_media(
    url: str,
    max_bytes: int | None = None,
    timeout_ms: int = 30000,
) -> LoadedMedia:
    """Load media from a web URL.

    Args:
        url: URL to load
        max_bytes: Maximum size in bytes
        timeout_ms: Timeout in milliseconds

    Returns:
        LoadedMedia with content and metadata

    Raises:
        Exception: If download fails or exceeds max_bytes

    Examples:
        >>> media = await load_web_media("https://example.com/image.jpg")
        >>> media.mime
        'image/jpeg'
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=timeout_ms / 1000)

        if not response.is_success:
            raise Exception(f"Failed to load media: HTTP {response.status_code}")

        content = response.content

        # Check size limit
        if max_bytes and len(content) > max_bytes:
            raise Exception(
                f"Media size {len(content)} exceeds limit {max_bytes} bytes"
            )

        # Detect MIME type
        mime = None
        detected = filetype.guess(content)
        if detected:
            mime = detected.mime
        elif response.headers.get("content-type"):
            mime = response.headers["content-type"].split(";")[0].strip()

        # Extract filename from URL
        filename = None
        try:
            path = httpx.URL(url).path
            if path:
                filename = Path(path).name
        except Exception:
            pass

        log_debug(f"Loaded web media: {url} ({len(content)} bytes, {mime})")

        return LoadedMedia(content=content, mime=mime, filename=filename)

    except httpx.TimeoutException as e:
        log_error(f"Timeout loading media from {url}: {e}")
        raise Exception(f"Media load timeout after {timeout_ms}ms")
    except Exception as e:
        log_error(f"Failed to load media from {url}: {e}")
        raise


def detect_mime_from_buffer(buffer: bytes, filename: str | None = None) -> str | None:
    """Detect MIME type from buffer.

    Args:
        buffer: File content bytes
        filename: Optional filename for extension-based detection

    Returns:
        MIME type string or None

    Examples:
        >>> detect_mime_from_buffer(b"\\xff\\xd8\\xff", "image.jpg")
        'image/jpeg'
    """
    # Try filetype detection
    detected = filetype.guess(buffer)
    if detected:
        return detected.mime

    # Fallback to extension-based detection
    if filename:
        ext = Path(filename).suffix.lower()
        ext_to_mime = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mp4": "video/mp4",
            ".mp3": "audio/mpeg",
            ".ogg": "audio/ogg",
            ".pdf": "application/pdf",
            ".txt": "text/plain",
        }
        return ext_to_mime.get(ext)

    return None
