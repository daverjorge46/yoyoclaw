"""Telegram update processing and deduplication.

This module handles Telegram update deduplication, media group processing,
and update key generation.
"""

import asyncio
import time
from typing import Any, NamedTuple

from openclaw_py.logging import log_debug, log_warn

# Media group timeout (milliseconds)
MEDIA_GROUP_TIMEOUT_MS = 1000  # 1 second


class MediaGroupEntry(NamedTuple):
    """Media group buffer entry.

    Attributes:
        media_group_id: Telegram media_group_id
        messages: List of messages in the group
        timer: Asyncio task for timeout handling
        received_at_ms: Timestamp when first message received
    """

    media_group_id: str
    messages: list[dict[str, Any]]
    timer: asyncio.Task | None
    received_at_ms: int


def resolve_telegram_update_id(update: dict[str, Any]) -> int | None:
    """Extract update_id from a Telegram update.

    Args:
        update: Telegram update object

    Returns:
        Update ID if present, None otherwise

    Examples:
        >>> resolve_telegram_update_id({"update_id": 123, "message": {...}})
        123
    """
    return update.get("update_id")


def build_telegram_update_key(update: dict[str, Any]) -> str:
    """Build a unique key for update deduplication.

    The key is used to detect and skip duplicate updates (e.g., from
    webhook retries or multiple bot instances).

    Args:
        update: Telegram update object

    Returns:
        Unique update key

    Examples:
        >>> build_telegram_update_key({"update_id": 123, "message": {...}})
        'update:123'
        >>> build_telegram_update_key({"update_id": 456, "callback_query": {...}})
        'update:456'
    """
    update_id = resolve_telegram_update_id(update)
    if update_id is not None:
        return f"update:{update_id}"

    # Fallback: use message_id if available
    message = update.get("message") or update.get("edited_message")
    if message:
        message_id = message.get("message_id")
        chat_id = message.get("chat", {}).get("id")
        if message_id is not None and chat_id is not None:
            return f"msg:{chat_id}:{message_id}"

    # Fallback: use callback_query id
    callback_query = update.get("callback_query")
    if callback_query:
        query_id = callback_query.get("id")
        if query_id:
            return f"callback:{query_id}"

    # Last resort: hash the update (should rarely happen)
    import hashlib
    import json

    update_json = json.dumps(update, sort_keys=True)
    update_hash = hashlib.sha256(update_json.encode()).hexdigest()[:16]
    return f"unknown:{update_hash}"


class TelegramUpdateDedupe:
    """Update deduplication tracker.

    Keeps track of recently seen update IDs to prevent duplicate processing.
    """

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 300):
        """Initialize update dedupe tracker.

        Args:
            max_size: Maximum number of update IDs to track
            ttl_seconds: Time-to-live for update IDs (default: 5 minutes)
        """
        self._seen: dict[str, float] = {}
        self._max_size = max_size
        self._ttl_seconds = ttl_seconds

    def is_duplicate(self, update_key: str) -> bool:
        """Check if an update has been seen before.

        Args:
            update_key: Update key from build_telegram_update_key()

        Returns:
            True if duplicate, False if first time seeing this update

        Examples:
            >>> dedupe = TelegramUpdateDedupe()
            >>> dedupe.is_duplicate("update:123")
            False
            >>> dedupe.is_duplicate("update:123")
            True
        """
        now = time.time()

        # Clean up expired entries
        self._cleanup(now)

        # Check if we've seen this update
        if update_key in self._seen:
            log_debug(f"Duplicate update detected: {update_key}")
            return True

        # Mark as seen
        self._seen[update_key] = now

        # Enforce max size limit
        if len(self._seen) > self._max_size:
            self._evict_oldest()

        return False

    def _cleanup(self, now: float) -> None:
        """Remove expired entries.

        Args:
            now: Current timestamp
        """
        expired_keys = [
            key for key, timestamp in self._seen.items() if now - timestamp > self._ttl_seconds
        ]

        for key in expired_keys:
            del self._seen[key]

        if expired_keys:
            log_debug(f"Cleaned up {len(expired_keys)} expired update keys")

    def _evict_oldest(self) -> None:
        """Evict oldest entries to maintain max size."""
        # Sort by timestamp and remove oldest entries
        sorted_items = sorted(self._seen.items(), key=lambda x: x[1])
        num_to_remove = len(self._seen) - self._max_size

        for key, _ in sorted_items[:num_to_remove]:
            del self._seen[key]

        log_debug(f"Evicted {num_to_remove} oldest update keys")

    def clear(self) -> None:
        """Clear all tracked updates (for testing)."""
        self._seen.clear()


def create_telegram_update_dedupe() -> TelegramUpdateDedupe:
    """Create a new update deduplication tracker.

    Returns:
        TelegramUpdateDedupe instance

    Examples:
        >>> dedupe = create_telegram_update_dedupe()
        >>> dedupe.is_duplicate("update:123")
        False
    """
    return TelegramUpdateDedupe()


def extract_media_group_id(message: dict[str, Any]) -> str | None:
    """Extract media_group_id from a Telegram message.

    Args:
        message: Telegram message object

    Returns:
        Media group ID if present, None otherwise

    Examples:
        >>> extract_media_group_id({"media_group_id": "12345"})
        '12345'
        >>> extract_media_group_id({"text": "hello"})
        None
    """
    return message.get("media_group_id")


def should_buffer_media_group(message: dict[str, Any]) -> bool:
    """Check if a message should be buffered for media group processing.

    Args:
        message: Telegram message object

    Returns:
        True if message is part of a media group and should be buffered

    Examples:
        >>> should_buffer_media_group({"media_group_id": "12345", "photo": [...]})
        True
        >>> should_buffer_media_group({"text": "hello"})
        False
    """
    media_group_id = extract_media_group_id(message)
    if not media_group_id:
        return False

    # Check if message has media (photo, video, document, audio)
    has_media = any(
        key in message for key in ["photo", "video", "document", "audio", "animation"]
    )

    return has_media


class MediaGroupBuffer:
    """Buffer for collecting media group messages.

    Telegram sends media groups (albums) as multiple separate messages with
    the same media_group_id. This buffer collects them and processes them
    together after a short timeout.
    """

    def __init__(self, timeout_ms: int = MEDIA_GROUP_TIMEOUT_MS):
        """Initialize media group buffer.

        Args:
            timeout_ms: Timeout in milliseconds before processing buffered group
        """
        self._buffer: dict[str, MediaGroupEntry] = {}
        self._timeout_ms = timeout_ms

    async def add_message(
        self,
        media_group_id: str,
        message: dict[str, Any],
        on_flush: Any,  # Callable that processes the buffered messages
    ) -> None:
        """Add a message to the media group buffer.

        Args:
            media_group_id: Media group ID
            message: Telegram message object
            on_flush: Async callback to process buffered messages
        """
        now_ms = int(time.time() * 1000)

        if media_group_id in self._buffer:
            # Add to existing buffer
            entry = self._buffer[media_group_id]
            entry.messages.append(message)

            # Cancel old timer
            if entry.timer and not entry.timer.done():
                entry.timer.cancel()

            # Create new timer
            timer = asyncio.create_task(self._flush_after_timeout(media_group_id, on_flush))
            self._buffer[media_group_id] = entry._replace(timer=timer)

            log_debug(
                f"Added message to media group {media_group_id}: "
                f"{len(entry.messages)} messages total"
            )
        else:
            # Create new buffer entry
            timer = asyncio.create_task(self._flush_after_timeout(media_group_id, on_flush))
            entry = MediaGroupEntry(
                media_group_id=media_group_id,
                messages=[message],
                timer=timer,
                received_at_ms=now_ms,
            )
            self._buffer[media_group_id] = entry

            log_debug(f"Started buffering media group {media_group_id}")

    async def _flush_after_timeout(self, media_group_id: str, on_flush: Any) -> None:
        """Flush media group buffer after timeout.

        Args:
            media_group_id: Media group ID
            on_flush: Async callback to process buffered messages
        """
        try:
            # Wait for timeout
            await asyncio.sleep(self._timeout_ms / 1000)

            # Flush the buffer
            await self.flush(media_group_id, on_flush)
        except asyncio.CancelledError:
            # Timer was cancelled (new message arrived)
            pass
        except Exception as e:
            log_warn(f"Error flushing media group {media_group_id}: {e}")

    async def flush(self, media_group_id: str, on_flush: Any) -> None:
        """Flush a media group buffer immediately.

        Args:
            media_group_id: Media group ID
            on_flush: Async callback to process buffered messages
        """
        if media_group_id not in self._buffer:
            return

        entry = self._buffer.pop(media_group_id)

        log_debug(f"Flushing media group {media_group_id}: {len(entry.messages)} messages")

        try:
            await on_flush(entry.messages)
        except Exception as e:
            log_warn(f"Error processing media group {media_group_id}: {e}")
