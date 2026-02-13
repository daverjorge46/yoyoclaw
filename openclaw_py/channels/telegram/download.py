"""Telegram file download utilities.

This module provides functions for downloading files from Telegram's servers.
"""

import filetype
import httpx
from pathlib import Path
from typing import NamedTuple

from openclaw_py.logging import log_debug, log_error


class TelegramFileInfo(NamedTuple):
    """Information about a Telegram file."""

    file_id: str
    file_unique_id: str | None = None
    file_size: int | None = None
    file_path: str | None = None


class SavedMedia(NamedTuple):
    """Saved media file information."""

    file_path: str
    content_type: str | None
    size: int


async def get_telegram_file(
    token: str,
    file_id: str,
    timeout_ms: int = 30000,
) -> TelegramFileInfo:
    """Get file information from Telegram.

    Args:
        token: Telegram bot token
        file_id: File ID from Telegram
        timeout_ms: Request timeout in milliseconds

    Returns:
        TelegramFileInfo with file metadata

    Raises:
        Exception: If API request fails

    Examples:
        >>> info = await get_telegram_file("token", "file_id_123")
        >>> info.file_path
        'photos/file_123.jpg'
    """
    url = f"https://api.telegram.org/bot{token}/getFile"
    params = {"file_id": file_id}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                timeout=timeout_ms / 1000,
            )

        if not response.is_success:
            raise Exception(
                f"getFile failed: {response.status_code} {response.reason_phrase}"
            )

        data = response.json()

        if not data.get("ok") or not data.get("result", {}).get("file_path"):
            raise Exception("getFile returned no file_path")

        result = data["result"]
        return TelegramFileInfo(
            file_id=result["file_id"],
            file_unique_id=result.get("file_unique_id"),
            file_size=result.get("file_size"),
            file_path=result.get("file_path"),
        )

    except httpx.TimeoutException as e:
        log_error(f"Timeout getting Telegram file: {e}")
        raise Exception(f"getFile timeout after {timeout_ms}ms")
    except Exception as e:
        log_error(f"Failed to get Telegram file: {e}")
        raise


async def download_telegram_file(
    token: str,
    info: TelegramFileInfo,
    save_dir: str | Path,
    max_bytes: int | None = None,
    timeout_ms: int = 60000,
) -> SavedMedia:
    """Download a file from Telegram.

    Args:
        token: Telegram bot token
        info: File information from get_telegram_file
        save_dir: Directory to save the file
        max_bytes: Maximum file size in bytes (optional)
        timeout_ms: Download timeout in milliseconds

    Returns:
        SavedMedia with file path and metadata

    Raises:
        Exception: If download fails or file exceeds max_bytes

    Examples:
        >>> info = TelegramFileInfo(file_id="123", file_path="photos/file.jpg")
        >>> saved = await download_telegram_file("token", info, "/tmp")
        >>> saved.file_path
        '/tmp/file.jpg'
    """
    if not info.file_path:
        raise Exception("file_path missing in TelegramFileInfo")

    url = f"https://api.telegram.org/file/bot{token}/{info.file_path}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=timeout_ms / 1000)

        if not response.is_success:
            raise Exception(
                f"Failed to download telegram file: HTTP {response.status_code}"
            )

        # Get file content
        file_bytes = response.content

        # Check size limit
        if max_bytes and len(file_bytes) > max_bytes:
            raise Exception(
                f"File size {len(file_bytes)} exceeds limit {max_bytes} bytes"
            )

        # Detect MIME type
        content_type = None
        detected = filetype.guess(file_bytes)
        if detected:
            content_type = detected.mime
        elif response.headers.get("content-type"):
            content_type = response.headers["content-type"]

        # Determine filename
        filename = Path(info.file_path).name
        if not filename:
            filename = f"file_{info.file_id}"
            # Add extension based on MIME type
            if content_type:
                ext = _get_extension_from_mime(content_type)
                if ext:
                    filename = f"{filename}.{ext}"

        # Save file
        save_path = Path(save_dir) / filename
        save_path.parent.mkdir(parents=True, exist_ok=True)

        with open(save_path, "wb") as f:
            f.write(file_bytes)

        log_debug(f"Downloaded Telegram file: {save_path} ({len(file_bytes)} bytes)")

        return SavedMedia(
            file_path=str(save_path),
            content_type=content_type,
            size=len(file_bytes),
        )

    except httpx.TimeoutException as e:
        log_error(f"Timeout downloading Telegram file: {e}")
        raise Exception(f"Download timeout after {timeout_ms}ms")
    except Exception as e:
        log_error(f"Failed to download Telegram file: {e}")
        raise


def _get_extension_from_mime(mime: str) -> str | None:
    """Get file extension from MIME type.

    Args:
        mime: MIME type string

    Returns:
        File extension without dot, or None

    Examples:
        >>> _get_extension_from_mime("image/jpeg")
        'jpg'
        >>> _get_extension_from_mime("video/mp4")
        'mp4'
    """
    mime_to_ext = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/mpeg": "mpeg",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
        "application/pdf": "pdf",
        "application/zip": "zip",
    }
    return mime_to_ext.get(mime.lower())
