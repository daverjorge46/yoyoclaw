"""Telegram bot helper functions.

This module provides utility functions for Telegram bot operations.
"""

from openclaw_py.config import OpenClawConfig, TelegramAccountConfig
from openclaw_py.types import ChatType

from .types import TelegramStreamMode


def build_telegram_group_peer_id(chat_id: int, thread_id: int | None = None) -> str:
    """Build a unique peer ID for a Telegram group or supergroup.

    Args:
        chat_id: Telegram chat ID
        thread_id: Optional forum topic thread ID

    Returns:
        Peer ID in format "tg:{chat_id}" or "tg:{chat_id}:{thread_id}"

    Examples:
        >>> build_telegram_group_peer_id(-1001234567890)
        'tg:-1001234567890'
        >>> build_telegram_group_peer_id(-1001234567890, 42)
        'tg:-1001234567890:42'
    """
    if thread_id is not None:
        return f"tg:{chat_id}:{thread_id}"
    return f"tg:{chat_id}"


def build_telegram_parent_peer(chat_id: int) -> str:
    """Build parent peer ID for a Telegram chat (without thread).

    Args:
        chat_id: Telegram chat ID

    Returns:
        Parent peer ID in format "tg:{chat_id}"

    Examples:
        >>> build_telegram_parent_peer(-1001234567890)
        'tg:-1001234567890'
    """
    return f"tg:{chat_id}"


def resolve_telegram_forum_thread_id(message: dict) -> int | None:
    """Extract forum topic thread ID from a Telegram message.

    Args:
        message: Telegram message object (dict from aiogram)

    Returns:
        Thread ID if message is in a forum topic, otherwise None

    Examples:
        >>> resolve_telegram_forum_thread_id({"message_thread_id": 42})
        42
        >>> resolve_telegram_forum_thread_id({"chat": {"id": 123}})
        None
    """
    # Check for message_thread_id in the message
    thread_id = message.get("message_thread_id")
    if thread_id is not None:
        return int(thread_id)

    # Check if this is a forum topic message (has is_topic_message flag)
    if message.get("is_topic_message"):
        # If is_topic_message is True but no message_thread_id, return None
        # (shouldn't happen in practice, but be defensive)
        return None

    return None


def resolve_telegram_stream_mode(
    config: OpenClawConfig | None,
    account_config: TelegramAccountConfig | None,
) -> TelegramStreamMode:
    """Resolve the draft streaming mode for Telegram.

    Args:
        config: Global OpenClaw configuration
        account_config: Telegram account-specific configuration

    Returns:
        Stream mode: "off", "partial", or "block"

    Examples:
        >>> resolve_telegram_stream_mode(config, account_config)
        'partial'
    """
    # Check account-specific config first
    if account_config and account_config.stream_mode:
        return account_config.stream_mode

    # Fall back to global Telegram config
    if config and config.channels and config.channels.telegram:
        telegram_config = config.channels.telegram
        if telegram_config.stream_mode:
            return telegram_config.stream_mode

    # Default to "partial" (draft streaming enabled)
    return "partial"


def normalize_telegram_chat_type(telegram_chat_type: str | None) -> ChatType | None:
    """Normalize Telegram chat type to OpenClaw ChatType.

    Args:
        telegram_chat_type: Telegram chat type ("private", "group", "supergroup", "channel")

    Returns:
        OpenClaw ChatType or None

    Examples:
        >>> normalize_telegram_chat_type("private")
        'direct'
        >>> normalize_telegram_chat_type("group")
        'group'
        >>> normalize_telegram_chat_type("supergroup")
        'group'
        >>> normalize_telegram_chat_type("channel")
        'channel'
    """
    if not telegram_chat_type:
        return None

    chat_type_lower = telegram_chat_type.lower().strip()

    # Map Telegram chat types to OpenClaw ChatType
    mapping = {
        "private": "direct",
        "group": "group",
        "supergroup": "group",  # Treat supergroups as regular groups
        "channel": "channel",
    }

    return mapping.get(chat_type_lower)


def get_telegram_sequential_key(
    chat_id: int | None = None,
    message_text: str | None = None,
    is_control_command: bool = False,
    is_group: bool = False,
) -> str:
    """Generate a sequential processing key for Telegram updates.

    This key is used to ensure messages from the same chat are processed
    sequentially (not in parallel) to maintain conversation order.

    Args:
        chat_id: Telegram chat ID
        message_text: Message text (for detecting control commands)
        is_control_command: Whether this is a control command
        is_group: Whether this is a group chat

    Returns:
        Sequential key for grammy sequentialize middleware

    Examples:
        >>> get_telegram_sequential_key(chat_id=123)
        'telegram:123'
        >>> get_telegram_sequential_key(chat_id=123, is_control_command=True)
        'telegram:123:control'
        >>> get_telegram_sequential_key(chat_id=123, is_group=True)
        'telegram:123:group'
    """
    if chat_id is None:
        return "telegram:unknown"

    base_key = f"telegram:{chat_id}"

    # Control commands get special treatment (higher priority)
    if is_control_command:
        return f"{base_key}:control"

    # Group messages get their own sequential queue
    if is_group:
        return f"{base_key}:group"

    return base_key
