"""Telegram bot channel for OpenClaw.

This module provides Telegram bot integration using aiogram 3.x.
"""

from .accounts import (
    ResolvedTelegramAccount,
    list_enabled_telegram_accounts,
    list_telegram_account_ids,
    normalize_account_id,
    resolve_default_telegram_account_id,
    resolve_telegram_account,
)
from .api_logging import (
    log_telegram_api_error,
    log_telegram_api_warning,
    with_telegram_api_error_logging,
)
from .bot import TelegramBotInstance, create_telegram_bot, start_telegram_bot
from .helpers import (
    build_telegram_group_peer_id,
    build_telegram_parent_peer,
    get_telegram_sequential_key,
    normalize_telegram_chat_type,
    resolve_telegram_forum_thread_id,
    resolve_telegram_stream_mode,
)
from .message_context import build_telegram_message_context
from .monitor import get_telegram_bot_info, monitor_telegram_provider
from .token import TokenResolution, resolve_telegram_token
from .types import (
    StickerMetadata,
    TelegramBotOptions,
    TelegramMediaRef,
    TelegramMessageContext,
    TelegramStreamMode,
)
from .updates import (
    MediaGroupBuffer,
    MediaGroupEntry,
    TelegramUpdateDedupe,
    build_telegram_update_key,
    create_telegram_update_dedupe,
    extract_media_group_id,
    resolve_telegram_update_id,
    should_buffer_media_group,
)

__all__ = [
    # Types
    "TelegramBotOptions",
    "TelegramMediaRef",
    "TelegramMessageContext",
    "TelegramStreamMode",
    "StickerMetadata",
    # Bot creation
    "TelegramBotInstance",
    "create_telegram_bot",
    "start_telegram_bot",
    # Accounts
    "ResolvedTelegramAccount",
    "resolve_telegram_account",
    "list_telegram_account_ids",
    "list_enabled_telegram_accounts",
    "resolve_default_telegram_account_id",
    "normalize_account_id",
    # Token
    "TokenResolution",
    "resolve_telegram_token",
    # Helpers
    "build_telegram_group_peer_id",
    "build_telegram_parent_peer",
    "resolve_telegram_forum_thread_id",
    "resolve_telegram_stream_mode",
    "normalize_telegram_chat_type",
    "get_telegram_sequential_key",
    # Message context
    "build_telegram_message_context",
    # Updates
    "TelegramUpdateDedupe",
    "create_telegram_update_dedupe",
    "build_telegram_update_key",
    "resolve_telegram_update_id",
    "MediaGroupEntry",
    "MediaGroupBuffer",
    "extract_media_group_id",
    "should_buffer_media_group",
    # API logging
    "with_telegram_api_error_logging",
    "log_telegram_api_error",
    "log_telegram_api_warning",
    # Monitoring
    "monitor_telegram_provider",
    "get_telegram_bot_info",
]
