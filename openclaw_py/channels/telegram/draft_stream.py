"""Telegram draft streaming.

This module provides utilities for streaming draft message updates to Telegram,
with throttling and deduplication to avoid excessive API calls.
"""

import asyncio
from typing import Callable

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from openclaw_py.logging import log_debug, log_warn

TELEGRAM_DRAFT_MAX_CHARS = 4096
DEFAULT_THROTTLE_MS = 300


class TelegramDraftStream:
    """Telegram draft streaming manager.

    Handles throttled updates to a draft message, ensuring we don't spam
    the Telegram API with too many edit requests.
    """

    def __init__(
        self,
        bot: Bot,
        chat_id: int,
        message_id: int,
        max_chars: int = TELEGRAM_DRAFT_MAX_CHARS,
        throttle_ms: int = DEFAULT_THROTTLE_MS,
        message_thread_id: int | None = None,
        log_fn: Callable[[str], None] | None = None,
        warn_fn: Callable[[str], None] | None = None,
    ):
        """Initialize draft stream.

        Args:
            bot: Aiogram Bot instance
            chat_id: Telegram chat ID
            message_id: Message ID to edit
            max_chars: Maximum characters per draft (default 4096)
            throttle_ms: Minimum milliseconds between updates (default 300)
            message_thread_id: Optional forum thread ID
            log_fn: Optional logging function
            warn_fn: Optional warning function
        """
        self.bot = bot
        self.chat_id = chat_id
        self.message_id = message_id
        self.max_chars = min(max_chars, TELEGRAM_DRAFT_MAX_CHARS)
        self.throttle_ms = max(50, throttle_ms)
        self.message_thread_id = message_thread_id
        self._log = log_fn or log_debug
        self._warn = warn_fn or log_warn

        self._last_sent_text = ""
        self._last_sent_at = 0.0
        self._pending_text = ""
        self._in_flight = False
        self._timer_task: asyncio.Task | None = None
        self._stopped = False

        self._log(
            f"telegram draft stream ready (message_id={message_id}, "
            f"max_chars={self.max_chars}, throttle_ms={self.throttle_ms})"
        )

    async def _send_draft(self, text: str) -> None:
        """Send draft update to Telegram.

        Args:
            text: Draft text to send
        """
        if self._stopped:
            return

        trimmed = text.rstrip()
        if not trimmed:
            return

        if len(trimmed) > self.max_chars:
            # Stop streaming if text exceeds max length
            self._stopped = True
            self._warn(
                f"telegram draft stream stopped (draft length {len(trimmed)} > {self.max_chars})"
            )
            return

        if trimmed == self._last_sent_text:
            return

        self._last_sent_text = trimmed
        self._last_sent_at = asyncio.get_event_loop().time()

        try:
            # Use edit_message_text to update the draft
            await self.bot.edit_message_text(
                text=trimmed,
                chat_id=self.chat_id,
                message_id=self.message_id,
            )
        except TelegramAPIError as e:
            self._stopped = True
            self._warn(f"telegram draft stream failed: {e}")
        except Exception as e:
            self._stopped = True
            self._warn(f"telegram draft stream error: {e}")

    async def flush(self) -> None:
        """Flush pending draft update immediately."""
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass
            self._timer_task = None

        if self._in_flight:
            self._schedule()
            return

        text = self._pending_text
        trimmed = text.strip()

        if not trimmed:
            if self._pending_text == text:
                self._pending_text = ""
            if self._pending_text:
                self._schedule()
            return

        self._pending_text = ""
        self._in_flight = True

        try:
            await self._send_draft(text)
        finally:
            self._in_flight = False

        if self._pending_text:
            self._schedule()

    def _schedule(self) -> None:
        """Schedule a delayed flush."""
        if self._timer_task and not self._timer_task.done():
            return

        current_time = asyncio.get_event_loop().time()
        delay = max(0, (self.throttle_ms / 1000) - (current_time - self._last_sent_at))

        async def delayed_flush():
            await asyncio.sleep(delay)
            await self.flush()

        self._timer_task = asyncio.create_task(delayed_flush())

    def update(self, text: str) -> None:
        """Update draft with new text.

        This queues the text for sending with throttling applied.

        Args:
            text: New draft text
        """
        if self._stopped:
            return

        self._pending_text = text

        if self._in_flight:
            self._schedule()
            return

        current_time = asyncio.get_event_loop().time()
        if (
            not self._timer_task or self._timer_task.done()
        ) and current_time - self._last_sent_at >= self.throttle_ms / 1000:
            # Send immediately
            asyncio.create_task(self.flush())
            return

        self._schedule()

    def stop(self) -> None:
        """Stop the draft stream."""
        self._stopped = True
        self._pending_text = ""

        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            self._timer_task = None


def create_telegram_draft_stream(
    bot: Bot,
    chat_id: int,
    message_id: int,
    max_chars: int = TELEGRAM_DRAFT_MAX_CHARS,
    throttle_ms: int = DEFAULT_THROTTLE_MS,
    message_thread_id: int | None = None,
    log_fn: Callable[[str], None] | None = None,
    warn_fn: Callable[[str], None] | None = None,
) -> TelegramDraftStream:
    """Create a Telegram draft stream.

    Args:
        bot: Aiogram Bot instance
        chat_id: Telegram chat ID
        message_id: Message ID to edit
        max_chars: Maximum characters per draft (default 4096)
        throttle_ms: Minimum milliseconds between updates (default 300)
        message_thread_id: Optional forum thread ID
        log_fn: Optional logging function
        warn_fn: Optional warning function

    Returns:
        TelegramDraftStream instance

    Examples:
        >>> stream = create_telegram_draft_stream(bot, 123, 456)
        >>> stream.update("Draft text here")
        >>> await stream.flush()
        >>> stream.stop()
    """
    return TelegramDraftStream(
        bot=bot,
        chat_id=chat_id,
        message_id=message_id,
        max_chars=max_chars,
        throttle_ms=throttle_ms,
        message_thread_id=message_thread_id,
        log_fn=log_fn,
        warn_fn=warn_fn,
    )
