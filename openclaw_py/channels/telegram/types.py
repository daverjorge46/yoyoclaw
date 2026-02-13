"""Telegram bot types and data models.

This module defines the core types for Telegram bot integration.
"""

from typing import Any

from pydantic import BaseModel, Field


# ============================================================================
# Stream Mode
# ============================================================================


TelegramStreamMode = str  # "off" | "partial" | "block"


# ============================================================================
# Media Reference
# ============================================================================


class TelegramMediaRef(BaseModel):
    """Reference to a Telegram media attachment.

    Used to track media files attached to messages for context building.
    """

    file_id: str
    file_unique_id: str | None = None
    file_size: int | None = None
    mime_type: str | None = None
    media_type: str  # "photo" | "video" | "audio" | "document" | "voice" | "sticker"
    caption: str | None = None
    width: int | None = None
    height: int | None = None
    duration: int | None = None
    thumb_file_id: str | None = None


# ============================================================================
# Bot Options
# ============================================================================


class TelegramBotOptions(BaseModel):
    """Options for creating a Telegram bot.

    This is a simplified Python version of the TypeScript TelegramBotOptions.
    """

    token: str
    account_id: str = "default"
    require_mention: bool | None = None
    allow_from: list[str | int] | None = None
    group_allow_from: list[str | int] | None = None
    media_max_mb: int | None = None
    reply_to_mode: str | None = None  # "off" | "first" | "all"

    # Update offset tracking (simplified)
    last_update_id: int | None = None


# ============================================================================
# Message Context
# ============================================================================


class TelegramMessageContext(BaseModel):
    """Complete Telegram message context for processing.

    This contains all the information needed to process a Telegram message
    and dispatch it to the agent runtime.
    """

    # Session and routing
    session_key: str
    agent_id: str
    account_id: str
    channel: str = "telegram"

    # Sender information
    sender_id: int
    sender_username: str | None = None
    sender_first_name: str | None = None
    sender_last_name: str | None = None

    # Chat information
    chat_id: int
    chat_type: str  # "private" | "group" | "supergroup" | "channel"
    chat_title: str | None = None
    thread_id: int | None = None  # For forum topics

    # Message content
    message_id: int
    text: str | None = None
    caption: str | None = None
    media: list[TelegramMediaRef] = Field(default_factory=list)

    # Context flags
    was_mentioned: bool = False
    is_reply: bool = False
    reply_to_message_id: int | None = None

    # Access control
    is_allowed: bool = True
    allow_source: str | None = None  # "config" | "pairing" | "owner"

    # Extras
    extra: dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Sticker Metadata
# ============================================================================


class StickerMetadata(BaseModel):
    """Telegram sticker metadata for context enrichment and caching."""

    emoji: str | None = None
    set_name: str | None = None
    file_id: str | None = None
    file_unique_id: str | None = None
    cached_description: str | None = None
