"""Telegram message sending and media upload.

This module provides functions for sending text and media messages via Telegram,
with support for formatting, retries, and various media types.
"""

import re
from pathlib import Path
from typing import Any, Literal, NamedTuple

from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.types import (
    BufferedInputFile,
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
)

from openclaw_py.config import OpenClawConfig, load_config_file
from openclaw_py.logging import log_debug, log_error, log_info

from .accounts import resolve_telegram_account
from .caption import split_telegram_caption
from .format import render_telegram_html_text
from .media import is_gif_media, load_web_media, media_kind_from_mime

# Telegram API error patterns
PARSE_ERR_RE = re.compile(r"can't parse entities|parse entities|find end of the entity", re.I)
THREAD_NOT_FOUND_RE = re.compile(r"400:\s*Bad Request:\s*message thread not found", re.I)
CHAT_NOT_FOUND_RE = re.compile(r"400: Bad Request: chat not found", re.I)


class TelegramSendResult(NamedTuple):
    """Result of sending a Telegram message."""

    message_id: str
    chat_id: str


class TelegramSendOptions(NamedTuple):
    """Options for sending Telegram messages."""

    token: str | None = None
    account_id: str | None = None
    verbose: bool = False
    media_url: str | None = None
    max_bytes: int | None = None
    text_mode: Literal["markdown", "html"] = "markdown"
    plain_text: str | None = None
    as_voice: bool = False
    as_video_note: bool = False
    silent: bool = False
    reply_to_message_id: int | None = None
    quote_text: str | None = None
    message_thread_id: int | None = None
    buttons: list[list[dict[str, str]]] | None = None


def normalize_chat_id(to: str) -> str:
    """Normalize chat ID for Telegram.

    Args:
        to: Raw chat ID or username

    Returns:
        Normalized chat ID

    Raises:
        ValueError: If chat ID is invalid

    Examples:
        >>> normalize_chat_id("@username")
        '@username'
        >>> normalize_chat_id("123456")
        '123456'
        >>> normalize_chat_id("-100123456")
        '-100123456'
    """
    trimmed = to.strip()
    if not trimmed:
        raise ValueError("Recipient is required for Telegram sends")

    # Remove internal prefixes like "telegram:" or "telegram:group:"
    normalized = trimmed
    if normalized.startswith("telegram:group:"):
        normalized = normalized[15:]
    elif normalized.startswith("telegram:"):
        normalized = normalized[9:]

    # Handle t.me links
    tme_match = re.match(r"^https?://t\.me/([A-Za-z0-9_]+)$", normalized, re.I)
    if not tme_match:
        tme_match = re.match(r"^t\.me/([A-Za-z0-9_]+)$", normalized, re.I)

    if tme_match:
        username = tme_match.group(1)
        return f"@{username}"

    # Return as-is if starts with @
    if normalized.startswith("@"):
        return normalized

    # Return as-is if it's a numeric ID
    if re.match(r"^-?\d+$", normalized):
        return normalized

    # Assume it's a username without @
    if re.match(r"^[A-Za-z0-9_]{5,}$", normalized, re.I):
        return f"@{normalized}"

    return normalized


def normalize_message_id(raw: str | int) -> int:
    """Normalize message ID to integer.

    Args:
        raw: Message ID as string or int

    Returns:
        Integer message ID

    Raises:
        ValueError: If message ID is invalid

    Examples:
        >>> normalize_message_id(123)
        123
        >>> normalize_message_id("456")
        456
    """
    if isinstance(raw, int) and raw > 0:
        return int(raw)

    if isinstance(raw, str):
        value = raw.strip()
        if not value:
            raise ValueError("Message id is required")
        try:
            parsed = int(value)
            if parsed > 0:
                return parsed
        except ValueError:
            pass

    raise ValueError("Message id is required for Telegram actions")


def build_inline_keyboard(
    buttons: list[list[dict[str, str]]] | None,
) -> InlineKeyboardMarkup | None:
    """Build inline keyboard markup from button data.

    Args:
        buttons: 2D array of button objects with 'text' and 'callback_data'

    Returns:
        InlineKeyboardMarkup or None if no valid buttons

    Examples:
        >>> buttons = [[{"text": "Yes", "callback_data": "yes"}]]
        >>> keyboard = build_inline_keyboard(buttons)
        >>> keyboard is not None
        True
    """
    if not buttons:
        return None

    rows = []
    for row in buttons:
        button_row = []
        for button in row:
            if button and button.get("text") and button.get("callback_data"):
                button_row.append(
                    InlineKeyboardButton(
                        text=button["text"],
                        callback_data=button["callback_data"],
                    )
                )
        if button_row:
            rows.append(button_row)

    if not rows:
        return None

    return InlineKeyboardMarkup(inline_keyboard=rows)


async def send_telegram_text(
    bot: Bot,
    chat_id: str | int,
    text: str,
    parse_mode: ParseMode = ParseMode.HTML,
    reply_to_message_id: int | None = None,
    message_thread_id: int | None = None,
    reply_markup: InlineKeyboardMarkup | None = None,
    disable_notification: bool = False,
) -> TelegramSendResult:
    """Send a text message via Telegram.

    Args:
        bot: Aiogram Bot instance
        chat_id: Chat ID or username
        text: Message text
        parse_mode: Parse mode (HTML or Markdown)
        reply_to_message_id: Message ID to reply to
        message_thread_id: Forum thread ID
        reply_markup: Inline keyboard
        disable_notification: Send silently

    Returns:
        TelegramSendResult with message ID and chat ID

    Raises:
        TelegramAPIError: If send fails

    Examples:
        >>> result = await send_telegram_text(bot, 123, "Hello!")
        >>> result.message_id
        '456'
    """
    try:
        message = await bot.send_message(
            chat_id=chat_id,
            text=text,
            parse_mode=parse_mode,
            reply_to_message_id=reply_to_message_id,
            message_thread_id=message_thread_id,
            reply_markup=reply_markup,
            disable_notification=disable_notification,
        )

        log_debug(f"Sent Telegram message to {chat_id}: message_id={message.message_id}")

        return TelegramSendResult(
            message_id=str(message.message_id),
            chat_id=str(message.chat.id),
        )

    except TelegramAPIError as e:
        # Check for parse errors and retry with plain text
        if PARSE_ERR_RE.search(str(e)):
            log_debug(f"Parse error, retrying without parse_mode: {e}")
            message = await bot.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode=None,
                reply_to_message_id=reply_to_message_id,
                message_thread_id=message_thread_id,
                reply_markup=reply_markup,
                disable_notification=disable_notification,
            )
            return TelegramSendResult(
                message_id=str(message.message_id),
                chat_id=str(message.chat.id),
            )

        # Check for thread not found error
        if THREAD_NOT_FOUND_RE.search(str(e)) and message_thread_id:
            log_debug(f"Thread not found, retrying without thread_id: {e}")
            message = await bot.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode=parse_mode,
                reply_to_message_id=reply_to_message_id,
                reply_markup=reply_markup,
                disable_notification=disable_notification,
            )
            return TelegramSendResult(
                message_id=str(message.message_id),
                chat_id=str(message.chat.id),
            )

        # Enhance chat not found error
        if CHAT_NOT_FOUND_RE.search(str(e)):
            raise TelegramAPIError(
                f"Telegram send failed: chat not found (chat_id={chat_id}). "
                "Likely: bot not started in DM, bot removed from group/channel, "
                "group migrated (new -100… id), or wrong bot token."
            )

        raise


async def send_telegram_photo(
    bot: Bot,
    chat_id: str | int,
    photo_path: str | Path | bytes,
    caption: str | None = None,
    parse_mode: ParseMode = ParseMode.HTML,
    reply_to_message_id: int | None = None,
    message_thread_id: int | None = None,
    reply_markup: InlineKeyboardMarkup | None = None,
    disable_notification: bool = False,
) -> TelegramSendResult:
    """Send a photo via Telegram.

    Args:
        bot: Aiogram Bot instance
        chat_id: Chat ID or username
        photo_path: Path to photo file or bytes
        caption: Optional caption
        parse_mode: Parse mode for caption
        reply_to_message_id: Message ID to reply to
        message_thread_id: Forum thread ID
        reply_markup: Inline keyboard
        disable_notification: Send silently

    Returns:
        TelegramSendResult with message ID and chat ID

    Raises:
        TelegramAPIError: If send fails
    """
    # Prepare photo input
    if isinstance(photo_path, bytes):
        photo = BufferedInputFile(photo_path, filename="photo.jpg")
    else:
        photo = FSInputFile(photo_path)

    message = await bot.send_photo(
        chat_id=chat_id,
        photo=photo,
        caption=caption,
        parse_mode=parse_mode if caption else None,
        reply_to_message_id=reply_to_message_id,
        message_thread_id=message_thread_id,
        reply_markup=reply_markup,
        disable_notification=disable_notification,
    )

    log_debug(f"Sent Telegram photo to {chat_id}: message_id={message.message_id}")

    return TelegramSendResult(
        message_id=str(message.message_id),
        chat_id=str(message.chat.id),
    )


async def send_telegram_document(
    bot: Bot,
    chat_id: str | int,
    document_path: str | Path | bytes,
    filename: str | None = None,
    caption: str | None = None,
    parse_mode: ParseMode = ParseMode.HTML,
    reply_to_message_id: int | None = None,
    message_thread_id: int | None = None,
    reply_markup: InlineKeyboardMarkup | None = None,
    disable_notification: bool = False,
) -> TelegramSendResult:
    """Send a document via Telegram.

    Args:
        bot: Aiogram Bot instance
        chat_id: Chat ID or username
        document_path: Path to document file or bytes
        filename: Optional filename
        caption: Optional caption
        parse_mode: Parse mode for caption
        reply_to_message_id: Message ID to reply to
        message_thread_id: Forum thread ID
        reply_markup: Inline keyboard
        disable_notification: Send silently

    Returns:
        TelegramSendResult with message ID and chat ID

    Raises:
        TelegramAPIError: If send fails
    """
    # Prepare document input
    if isinstance(document_path, bytes):
        document = BufferedInputFile(document_path, filename=filename or "document")
    else:
        document = FSInputFile(document_path)

    message = await bot.send_document(
        chat_id=chat_id,
        document=document,
        caption=caption,
        parse_mode=parse_mode if caption else None,
        reply_to_message_id=reply_to_message_id,
        message_thread_id=message_thread_id,
        reply_markup=reply_markup,
        disable_notification=disable_notification,
    )

    log_debug(f"Sent Telegram document to {chat_id}: message_id={message.message_id}")

    return TelegramSendResult(
        message_id=str(message.message_id),
        chat_id=str(message.chat.id),
    )


async def send_message_telegram(
    to: str,
    text: str,
    config: OpenClawConfig | None = None,
    **options: Any,
) -> TelegramSendResult:
    """Send a message via Telegram (main entry point).

    This is the primary function for sending messages via Telegram.
    Supports text messages, media uploads, formatting, and various options.

    Args:
        to: Recipient (chat ID, username, or t.me link)
        text: Message text
        config: OpenClaw configuration
        **options: Additional options (see TelegramSendOptions)

    Returns:
        TelegramSendResult with message ID and chat ID

    Raises:
        Exception: If send fails

    Examples:
        >>> result = await send_message_telegram("@username", "Hello!")
        >>> result.message_id
        '123'
    """
    # Load config if not provided
    if not config:
        config = load_config_file()

    # Resolve account
    account = resolve_telegram_account(
        config=config,
        account_id=options.get("account_id"),
    )

    # Get token
    token = options.get("token") or account.token
    if not token:
        raise ValueError(
            f"Telegram bot token missing for account '{account.account_id}'"
        )

    # Normalize chat ID
    chat_id = normalize_chat_id(to)

    # Create bot instance
    bot = Bot(token=token)

    try:
        # Get options
        media_url = options.get("media_url")
        text_mode = options.get("text_mode", "markdown")
        reply_to_message_id = options.get("reply_to_message_id")
        message_thread_id = options.get("message_thread_id")
        silent = options.get("silent", False)
        buttons = options.get("buttons")

        # Build inline keyboard
        reply_markup = build_inline_keyboard(buttons)

        # Handle media sending
        if media_url:
            return await _send_with_media(
                bot=bot,
                chat_id=chat_id,
                text=text,
                media_url=media_url,
                text_mode=text_mode,
                reply_to_message_id=reply_to_message_id,
                message_thread_id=message_thread_id,
                reply_markup=reply_markup,
                disable_notification=silent,
                max_bytes=options.get("max_bytes"),
            )

        # Send text-only message
        html_text = render_telegram_html_text(text, text_mode=text_mode)

        return await send_telegram_text(
            bot=bot,
            chat_id=chat_id,
            text=html_text,
            parse_mode=ParseMode.HTML,
            reply_to_message_id=reply_to_message_id,
            message_thread_id=message_thread_id,
            reply_markup=reply_markup,
            disable_notification=silent,
        )

    finally:
        await bot.session.close()


async def _send_with_media(
    bot: Bot,
    chat_id: str | int,
    text: str,
    media_url: str,
    text_mode: Literal["markdown", "html"],
    reply_to_message_id: int | None,
    message_thread_id: int | None,
    reply_markup: InlineKeyboardMarkup | None,
    disable_notification: bool,
    max_bytes: int | None,
) -> TelegramSendResult:
    """Send message with media attachment.

    Args:
        bot: Bot instance
        chat_id: Chat ID
        text: Caption text
        media_url: URL to media file
        text_mode: Text format mode
        reply_to_message_id: Reply message ID
        message_thread_id: Thread ID
        reply_markup: Inline keyboard
        disable_notification: Silent mode
        max_bytes: Max file size

    Returns:
        TelegramSendResult
    """
    # Load media from URL
    log_debug(f"Loading media from URL: {media_url}")
    media = await load_web_media(media_url, max_bytes=max_bytes)

    # Determine media type
    media_kind = media_kind_from_mime(media.mime)

    # Format caption
    html_text = render_telegram_html_text(text, text_mode=text_mode)
    caption_data = split_telegram_caption(html_text)

    # Send media
    if media_kind == "photo" and not is_gif_media(media.mime, media.filename):
        result = await send_telegram_photo(
            bot=bot,
            chat_id=chat_id,
            photo_path=media.content,
            caption=caption_data["caption"],
            parse_mode=ParseMode.HTML if caption_data["caption"] else None,
            reply_to_message_id=reply_to_message_id,
            message_thread_id=message_thread_id,
            reply_markup=reply_markup,
            disable_notification=disable_notification,
        )
    else:
        # Send as document
        result = await send_telegram_document(
            bot=bot,
            chat_id=chat_id,
            document_path=media.content,
            filename=media.filename or "file",
            caption=caption_data["caption"],
            parse_mode=ParseMode.HTML if caption_data["caption"] else None,
            reply_to_message_id=reply_to_message_id,
            message_thread_id=message_thread_id,
            reply_markup=reply_markup,
            disable_notification=disable_notification,
        )

    # Send follow-up text if caption was too long
    if caption_data["followUpText"]:
        await send_telegram_text(
            bot=bot,
            chat_id=chat_id,
            text=caption_data["followUpText"],
            parse_mode=ParseMode.HTML,
            disable_notification=disable_notification,
        )

    return result
