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
from .caption import TELEGRAM_MAX_CAPTION_LENGTH, split_telegram_caption
from .download import (
    SavedMedia,
    TelegramFileInfo,
    download_telegram_file,
    get_telegram_file,
)
from .draft_chunking import (
    DraftChunkConfig,
    resolve_telegram_draft_streaming_chunking,
)
from .draft_stream import (
    TelegramDraftStream,
    create_telegram_draft_stream,
)
from .format import (
    TelegramFormattedChunk,
    markdown_to_telegram_chunks,
    markdown_to_telegram_html,
    markdown_to_telegram_html_chunks,
    render_telegram_html_text,
)
from .group_migration import (
    TelegramGroupMigrationResult,
    migrate_telegram_group_config,
    migrate_telegram_groups_in_place,
)
from .media import (
    LoadedMedia,
    is_gif_media,
    load_web_media,
    media_kind_from_mime,
)
from .send import (
    TelegramSendOptions,
    TelegramSendResult,
    build_inline_keyboard,
    normalize_chat_id,
    normalize_message_id,
    send_message_telegram,
    send_telegram_document,
    send_telegram_photo,
    send_telegram_text,
)
from .webhook import TelegramWebhookServer, start_telegram_webhook

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
    # Caption
    "TELEGRAM_MAX_CAPTION_LENGTH",
    "split_telegram_caption",
    # Download
    "TelegramFileInfo",
    "SavedMedia",
    "get_telegram_file",
    "download_telegram_file",
    # Draft chunking
    "DraftChunkConfig",
    "resolve_telegram_draft_streaming_chunking",
    # Draft stream
    "TelegramDraftStream",
    "create_telegram_draft_stream",
    # Format
    "TelegramFormattedChunk",
    "markdown_to_telegram_html",
    "render_telegram_html_text",
    "markdown_to_telegram_chunks",
    "markdown_to_telegram_html_chunks",
    # Group migration
    "TelegramGroupMigrationResult",
    "migrate_telegram_groups_in_place",
    "migrate_telegram_group_config",
    # Media
    "LoadedMedia",
    "media_kind_from_mime",
    "is_gif_media",
    "load_web_media",
    # Send
    "TelegramSendOptions",
    "TelegramSendResult",
    "normalize_chat_id",
    "normalize_message_id",
    "build_inline_keyboard",
    "send_telegram_text",
    "send_telegram_photo",
    "send_telegram_document",
    "send_message_telegram",
    # Webhook
    "TelegramWebhookServer",
    "start_telegram_webhook",
]
