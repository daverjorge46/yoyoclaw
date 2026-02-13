"""Telegram bot token resolution.

This module handles resolving Telegram bot tokens from various sources:
environment variables, config files, and token files.
"""

import os
from pathlib import Path
from typing import NamedTuple

from openclaw_py.config import OpenClawConfig
from openclaw_py.logging import log_debug


class TokenResolution(NamedTuple):
    """Result of token resolution."""

    token: str
    source: str  # "env" | "tokenFile" | "config" | "none"


def resolve_telegram_token(
    config: OpenClawConfig,
    account_id: str = "default",
) -> TokenResolution:
    """Resolve Telegram bot token from multiple sources.

    Resolution priority:
    1. Environment variable: TELEGRAM_BOT_TOKEN_{ACCOUNT_ID_UPPER}
    2. Environment variable: TELEGRAM_BOT_TOKEN (for default account)
    3. Token file: specified in config.channels.telegram.accounts[account_id].tokenFile
    4. Config file: config.channels.telegram.accounts[account_id].botToken
    5. Config file: config.channels.telegram.botToken (fallback)

    Args:
        config: OpenClaw configuration
        account_id: Telegram account ID (default: "default")

    Returns:
        TokenResolution with token and source

    Examples:
        >>> resolution = resolve_telegram_token(config, "default")
        >>> resolution.token
        '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'
        >>> resolution.source
        'env'
    """
    account_id_normalized = account_id.strip().lower()

    # 1. Try environment variable: TELEGRAM_BOT_TOKEN_{ACCOUNT_ID_UPPER}
    if account_id_normalized != "default":
        env_key = f"TELEGRAM_BOT_TOKEN_{account_id_normalized.upper()}"
        env_token = os.environ.get(env_key, "").strip()
        if env_token:
            log_debug(f"Resolved Telegram token from env: {env_key}")
            return TokenResolution(token=env_token, source="env")

    # 2. Try environment variable: TELEGRAM_BOT_TOKEN (for default account)
    env_token_default = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if env_token_default and account_id_normalized == "default":
        log_debug("Resolved Telegram token from env: TELEGRAM_BOT_TOKEN")
        return TokenResolution(token=env_token_default, source="env")

    # 3. Try token file
    token_from_file = _read_token_from_file(config, account_id_normalized)
    if token_from_file:
        log_debug(f"Resolved Telegram token from tokenFile for account: {account_id}")
        return TokenResolution(token=token_from_file, source="tokenFile")

    # 4. Try config file: account-specific botToken
    token_from_config = _read_token_from_config(config, account_id_normalized)
    if token_from_config:
        log_debug(f"Resolved Telegram token from config for account: {account_id}")
        return TokenResolution(token=token_from_config, source="config")

    # 5. No token found
    log_debug(f"No Telegram token found for account: {account_id}")
    return TokenResolution(token="", source="none")


def _read_token_from_file(config: OpenClawConfig, account_id: str) -> str:
    """Read token from file specified in config.

    Args:
        config: OpenClaw configuration
        account_id: Telegram account ID

    Returns:
        Token string if found, empty string otherwise
    """
    # Safely access config.channels
    channels = getattr(config, "channels", None)
    if not channels:
        return ""

    telegram_config = channels.get("telegram") if isinstance(channels, dict) else getattr(channels, "telegram", None)
    if not telegram_config:
        return ""

    # Check account-specific config
    accounts = telegram_config.accounts if hasattr(telegram_config, "accounts") else telegram_config.get("accounts")
    if accounts and account_id in accounts:
        account_config = accounts[account_id]
        token_file_path = getattr(account_config, "token_file", None) if hasattr(account_config, "token_file") else account_config.get("token_file")

        if token_file_path:
            return _read_token_file(token_file_path)

    # Check global telegram config
    token_file = getattr(telegram_config, "token_file", None) if hasattr(telegram_config, "token_file") else telegram_config.get("token_file")
    if token_file:
        return _read_token_file(token_file)

    return ""


def _read_token_from_config(config: OpenClawConfig, account_id: str) -> str:
    """Read token directly from config object.

    Args:
        config: OpenClaw configuration
        account_id: Telegram account ID

    Returns:
        Token string if found, empty string otherwise
    """
    # Safely access config.channels
    channels = getattr(config, "channels", None)
    if not channels:
        return ""

    telegram_config = channels.get("telegram") if isinstance(channels, dict) else getattr(channels, "telegram", None)
    if not telegram_config:
        return ""

    # Check account-specific config
    accounts = telegram_config.accounts if hasattr(telegram_config, "accounts") else telegram_config.get("accounts")
    if accounts and account_id in accounts:
        account_config = accounts[account_id]
        bot_token = getattr(account_config, "bot_token", None) if hasattr(account_config, "bot_token") else account_config.get("bot_token")
        if bot_token:
            return bot_token.strip()

    # Fallback to global telegram config
    bot_token = getattr(telegram_config, "bot_token", None) if hasattr(telegram_config, "bot_token") else telegram_config.get("bot_token")
    if bot_token:
        return bot_token.strip()

    return ""


def _read_token_file(file_path: str) -> str:
    """Read token from a file.

    Args:
        file_path: Path to token file

    Returns:
        Token string if file exists and is readable, empty string otherwise
    """
    try:
        path = Path(file_path).expanduser().resolve()
        if not path.exists():
            log_debug(f"Token file not found: {file_path}")
            return ""

        with open(path, "r", encoding="utf-8") as f:
            token = f.read().strip()
            if token:
                return token
    except Exception as e:
        log_debug(f"Failed to read token file {file_path}: {e}")

    return ""
