"""Telegram message context building.

This module builds the complete message context from Telegram updates,
including session key resolution, permission checking, and media extraction.
"""

from typing import Any

from openclaw_py.config import OpenClawConfig, TelegramAccountConfig
from openclaw_py.logging import log_debug, log_warn
from openclaw_py.types import DmPolicy, GroupPolicy

from .access import is_sender_allowed, normalize_allow_from_with_store
from .helpers import (
    build_telegram_group_peer_id,
    normalize_telegram_chat_type,
    resolve_telegram_forum_thread_id,
)
from .types import TelegramMediaRef, TelegramMessageContext


def build_telegram_message_context(
    message: dict[str, Any],
    account_id: str,
    config: OpenClawConfig,
    account_config: TelegramAccountConfig,
    all_media: list[dict[str, Any]] | None = None,
    store_allow_from: list[str] | None = None,
) -> TelegramMessageContext | None:
    """Build complete message context from Telegram message.

    Args:
        message: Telegram message object
        account_id: Telegram account ID
        config: OpenClaw configuration
        account_config: Telegram account configuration
        all_media: All media messages (for media groups)
        store_allow_from: AllowFrom list from pairing store

    Returns:
        TelegramMessageContext if message should be processed, None if should be skipped

    Examples:
        >>> context = build_telegram_message_context(message, "default", config, account_config)
        >>> context.session_key
        'telegram:default:dm:123456'
    """
    # Extract sender information
    sender = message.get("from")
    if not sender:
        log_debug("Skipping message: no sender")
        return None

    sender_id = sender.get("id")
    if not sender_id:
        log_debug("Skipping message: no sender ID")
        return None

    sender_username = sender.get("username")
    sender_first_name = sender.get("first_name")
    sender_last_name = sender.get("last_name")

    # Extract chat information
    chat = message.get("chat")
    if not chat:
        log_debug("Skipping message: no chat")
        return None

    chat_id = chat.get("id")
    if not chat_id:
        log_debug("Skipping message: no chat ID")
        return None

    chat_type = chat.get("type")  # "private", "group", "supergroup", "channel"
    chat_title = chat.get("title")
    openclaw_chat_type = normalize_telegram_chat_type(chat_type)

    # Extract message content
    message_id = message.get("message_id")
    text = message.get("text")
    caption = message.get("caption")
    thread_id = resolve_telegram_forum_thread_id(message)

    # Determine if this is a group message
    is_group = chat_type in ["group", "supergroup"]

    # Build session key (simplified - full routing in batch 13)
    session_key = _build_session_key(
        account_id=account_id,
        sender_id=sender_id,
        chat_id=chat_id,
        chat_type=chat_type,
        thread_id=thread_id,
    )

    # Resolve agent ID (simplified - full routing in batch 13)
    agent_id = "default"  # TODO: Implement proper agent routing in batch 13

    # Check permissions
    allow_from_config = account_config.allow_from or []
    dm_policy = account_config.dm_policy or "open"
    group_policy = account_config.group_policy or "disabled"

    # Merge allowFrom lists
    merged_allow_from = normalize_allow_from_with_store(allow_from_config, store_allow_from)

    # Check if sender is allowed
    is_allowed, allow_source = is_sender_allowed(
        sender_id=sender_id,
        sender_username=sender_username,
        allow_from=merged_allow_from,
        dm_policy=dm_policy if not is_group else None,
        group_policy=group_policy if is_group else None,
        is_group=is_group,
        is_owner=False,  # TODO: Implement owner detection in batch 12
    )

    if not is_allowed:
        log_debug(
            f"Skipping message from {sender_id} (@{sender_username}): not allowed",
            sender_id=sender_id,
            sender_username=sender_username,
            chat_id=chat_id,
        )
        return None

    # Extract media references
    media_refs = _extract_media_refs(message, all_media)

    # Check if message was a reply
    is_reply = "reply_to_message" in message
    reply_to_message_id = (
        message["reply_to_message"]["message_id"] if is_reply else None
    )

    # Check if bot was mentioned (simplified - full logic in handlers)
    was_mentioned = False
    if text and "@" in text:
        # TODO: Proper mention detection in handlers
        was_mentioned = True

    # Build context
    context = TelegramMessageContext(
        session_key=session_key,
        agent_id=agent_id,
        account_id=account_id,
        channel="telegram",
        sender_id=sender_id,
        sender_username=sender_username,
        sender_first_name=sender_first_name,
        sender_last_name=sender_last_name,
        chat_id=chat_id,
        chat_type=chat_type,
        chat_title=chat_title,
        thread_id=thread_id,
        message_id=message_id,
        text=text,
        caption=caption,
        media=media_refs,
        was_mentioned=was_mentioned,
        is_reply=is_reply,
        reply_to_message_id=reply_to_message_id,
        is_allowed=is_allowed,
        allow_source=allow_source,
    )

    log_debug(
        f"Built message context: session_key={session_key}, "
        f"sender={sender_id}, chat={chat_id}, media={len(media_refs)}"
    )

    return context


def _build_session_key(
    account_id: str,
    sender_id: int,
    chat_id: int,
    chat_type: str,
    thread_id: int | None = None,
) -> str:
    """Build session key for Telegram message.

    Simplified version - full routing logic in batch 13.

    Args:
        account_id: Telegram account ID
        sender_id: Telegram user ID
        chat_id: Telegram chat ID
        chat_type: Telegram chat type
        thread_id: Optional thread ID

    Returns:
        Session key

    Examples:
        >>> _build_session_key("default", 123, 123, "private")
        'telegram:default:dm:123'
        >>> _build_session_key("default", 456, -1001234, "group", 42)
        'telegram:default:group:tg:-1001234:42'
    """
    # For DMs, use sender ID
    if chat_type == "private":
        return f"telegram:{account_id}:dm:{sender_id}"

    # For groups, use group peer ID
    peer_id = build_telegram_group_peer_id(chat_id, thread_id)
    return f"telegram:{account_id}:group:{peer_id}"


def _extract_media_refs(
    primary_message: dict[str, Any],
    all_media: list[dict[str, Any]] | None = None,
) -> list[TelegramMediaRef]:
    """Extract media references from message(s).

    Args:
        primary_message: Primary Telegram message
        all_media: All messages in media group (if applicable)

    Returns:
        List of TelegramMediaRef objects

    Examples:
        >>> refs = _extract_media_refs(message_with_photo)
        >>> len(refs)
        1
        >>> refs[0].media_type
        'photo'
    """
    refs: list[TelegramMediaRef] = []

    # Process all media messages (for media groups)
    messages_to_process = all_media if all_media else [primary_message]

    for message in messages_to_process:
        # Photo
        if "photo" in message:
            photos = message["photo"]
            if photos:
                # Use largest photo
                largest = max(photos, key=lambda p: p.get("file_size", 0))
                refs.append(
                    TelegramMediaRef(
                        file_id=largest["file_id"],
                        file_unique_id=largest.get("file_unique_id"),
                        file_size=largest.get("file_size"),
                        media_type="photo",
                        caption=message.get("caption"),
                        width=largest.get("width"),
                        height=largest.get("height"),
                    )
                )

        # Video
        if "video" in message:
            video = message["video"]
            refs.append(
                TelegramMediaRef(
                    file_id=video["file_id"],
                    file_unique_id=video.get("file_unique_id"),
                    file_size=video.get("file_size"),
                    mime_type=video.get("mime_type"),
                    media_type="video",
                    caption=message.get("caption"),
                    width=video.get("width"),
                    height=video.get("height"),
                    duration=video.get("duration"),
                    thumb_file_id=video.get("thumb", {}).get("file_id") if "thumb" in video else None,
                )
            )

        # Audio
        if "audio" in message:
            audio = message["audio"]
            refs.append(
                TelegramMediaRef(
                    file_id=audio["file_id"],
                    file_unique_id=audio.get("file_unique_id"),
                    file_size=audio.get("file_size"),
                    mime_type=audio.get("mime_type"),
                    media_type="audio",
                    caption=message.get("caption"),
                    duration=audio.get("duration"),
                )
            )

        # Document
        if "document" in message:
            document = message["document"]
            refs.append(
                TelegramMediaRef(
                    file_id=document["file_id"],
                    file_unique_id=document.get("file_unique_id"),
                    file_size=document.get("file_size"),
                    mime_type=document.get("mime_type"),
                    media_type="document",
                    caption=message.get("caption"),
                )
            )

        # Voice
        if "voice" in message:
            voice = message["voice"]
            refs.append(
                TelegramMediaRef(
                    file_id=voice["file_id"],
                    file_unique_id=voice.get("file_unique_id"),
                    file_size=voice.get("file_size"),
                    mime_type=voice.get("mime_type"),
                    media_type="voice",
                    duration=voice.get("duration"),
                )
            )

        # Sticker
        if "sticker" in message:
            sticker = message["sticker"]
            refs.append(
                TelegramMediaRef(
                    file_id=sticker["file_id"],
                    file_unique_id=sticker.get("file_unique_id"),
                    file_size=sticker.get("file_size"),
                    media_type="sticker",
                    width=sticker.get("width"),
                    height=sticker.get("height"),
                )
            )

    return refs
