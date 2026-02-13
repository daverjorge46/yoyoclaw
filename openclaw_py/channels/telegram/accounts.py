"""Telegram account management.

This module handles Telegram account configuration and resolution,
supporting multiple Telegram bot accounts.
"""

from typing import NamedTuple

from openclaw_py.config import OpenClawConfig, TelegramAccountConfig
from openclaw_py.logging import log_debug

from .token import resolve_telegram_token


DEFAULT_ACCOUNT_ID = "default"


class ResolvedTelegramAccount(NamedTuple):
    """Resolved Telegram account configuration.

    Attributes:
        account_id: Account identifier
        enabled: Whether the account is enabled
        name: Optional account name
        token: Bot token
        token_source: Where the token came from
        config: Full account configuration
    """

    account_id: str
    enabled: bool
    name: str | None
    token: str
    token_source: str  # "env" | "tokenFile" | "config" | "none"
    config: TelegramAccountConfig


def normalize_account_id(account_id: str | None) -> str:
    """Normalize account ID to lowercase.

    Args:
        account_id: Raw account ID

    Returns:
        Normalized account ID (lowercase, stripped)

    Examples:
        >>> normalize_account_id("MyBot")
        'mybot'
        >>> normalize_account_id("  DEFAULT  ")
        'default'
    """
    if not account_id or not account_id.strip():
        return DEFAULT_ACCOUNT_ID
    return account_id.strip().lower()


def list_configured_account_ids(config: OpenClawConfig) -> list[str]:
    """List all configured Telegram account IDs.

    Args:
        config: OpenClaw configuration

    Returns:
        List of account IDs

    Examples:
        >>> list_configured_account_ids(config)
        ['default', 'bot2', 'bot3']
    """
    if not config.channels or not config.channels.telegram:
        return []

    telegram_config = config.channels.telegram
    if not telegram_config.accounts:
        return []

    account_ids = []
    for key in telegram_config.accounts.keys():
        if key.strip():
            account_ids.append(normalize_account_id(key))

    return sorted(set(account_ids))


def list_telegram_account_ids(config: OpenClawConfig) -> list[str]:
    """List all Telegram account IDs (configured or bound).

    If no accounts are configured, returns ["default"].

    Args:
        config: OpenClaw configuration

    Returns:
        List of account IDs

    Examples:
        >>> list_telegram_account_ids(config)
        ['default', 'bot2']
    """
    # Get configured accounts
    configured = list_configured_account_ids(config)

    # TODO (batch 13): Add bound accounts from routing config
    # bound = list_bound_account_ids(config, "telegram")
    # ids = list(set(configured + bound))

    ids = list(set(configured))

    log_debug(f"Telegram account IDs: {ids}")

    # If no accounts, return default
    if not ids:
        return [DEFAULT_ACCOUNT_ID]

    return sorted(ids)


def resolve_default_telegram_account_id(config: OpenClawConfig) -> str:
    """Resolve the default Telegram account ID.

    Args:
        config: OpenClaw configuration

    Returns:
        Default account ID

    Examples:
        >>> resolve_default_telegram_account_id(config)
        'default'
    """
    # TODO (batch 13): Check for bound default account
    # bound_default = resolve_default_agent_bound_account_id(config, "telegram")
    # if bound_default:
    #     return bound_default

    ids = list_telegram_account_ids(config)

    # Prefer "default" if it exists
    if DEFAULT_ACCOUNT_ID in ids:
        return DEFAULT_ACCOUNT_ID

    # Otherwise return first account
    return ids[0] if ids else DEFAULT_ACCOUNT_ID


def resolve_account_config(
    config: OpenClawConfig,
    account_id: str,
) -> TelegramAccountConfig | None:
    """Resolve account-specific configuration.

    Args:
        config: OpenClaw configuration
        account_id: Account ID

    Returns:
        TelegramAccountConfig if found, None otherwise
    """
    if not config.channels or not config.channels.telegram:
        return None

    telegram_config = config.channels.telegram
    if not telegram_config.accounts:
        return None

    # Try direct match
    if account_id in telegram_config.accounts:
        return telegram_config.accounts[account_id]

    # Try normalized match
    normalized = normalize_account_id(account_id)
    for key, account_cfg in telegram_config.accounts.items():
        if normalize_account_id(key) == normalized:
            return account_cfg

    return None


def merge_telegram_account_config(
    config: OpenClawConfig,
    account_id: str,
) -> TelegramAccountConfig:
    """Merge global and account-specific Telegram config.

    Account-specific config takes precedence over global config.

    Args:
        config: OpenClaw configuration
        account_id: Account ID

    Returns:
        Merged TelegramAccountConfig
    """
    # Start with global telegram config (excluding accounts)
    if config.channels and config.channels.telegram:
        base = config.channels.telegram.model_copy(deep=True)
        # Clear accounts to avoid confusion
        base.accounts = {}
    else:
        # Create empty config
        base = TelegramAccountConfig()

    # Get account-specific config
    account_cfg = resolve_account_config(config, account_id)

    if account_cfg:
        # Merge account config over base
        # Use model_dump to get dict, then merge
        base_dict = base.model_dump(exclude_none=True)
        account_dict = account_cfg.model_dump(exclude_none=True)

        # Account config overrides base
        merged_dict = {**base_dict, **account_dict}

        # Reconstruct config
        return TelegramAccountConfig(**merged_dict)

    return base


def resolve_telegram_account(
    config: OpenClawConfig,
    account_id: str | None = None,
) -> ResolvedTelegramAccount:
    """Resolve a Telegram account configuration.

    Args:
        config: OpenClaw configuration
        account_id: Optional account ID (defaults to default account)

    Returns:
        ResolvedTelegramAccount with all account details

    Examples:
        >>> account = resolve_telegram_account(config)
        >>> account.account_id
        'default'
        >>> account.enabled
        True
    """
    # Normalize account ID
    normalized_id = normalize_account_id(account_id)

    # Check if base telegram is enabled
    base_enabled = True
    if config.channels and config.channels.telegram:
        base_enabled = config.channels.telegram.enabled is not False

    # Merge account config
    merged = merge_telegram_account_config(config, normalized_id)

    # Check if account is enabled
    account_enabled = merged.enabled is not False
    enabled = base_enabled and account_enabled

    # Resolve token
    token_resolution = resolve_telegram_token(config, normalized_id)

    log_debug(
        f"Resolved Telegram account: {normalized_id}, "
        f"enabled={enabled}, token_source={token_resolution.source}"
    )

    return ResolvedTelegramAccount(
        account_id=normalized_id,
        enabled=enabled,
        name=merged.name.strip() if merged.name else None,
        token=token_resolution.token,
        token_source=token_resolution.source,
        config=merged,
    )


def list_enabled_telegram_accounts(config: OpenClawConfig) -> list[ResolvedTelegramAccount]:
    """List all enabled Telegram accounts.

    Args:
        config: OpenClaw configuration

    Returns:
        List of enabled ResolvedTelegramAccount objects

    Examples:
        >>> accounts = list_enabled_telegram_accounts(config)
        >>> len(accounts)
        2
    """
    account_ids = list_telegram_account_ids(config)
    accounts = [resolve_telegram_account(config, aid) for aid in account_ids]
    return [acc for acc in accounts if acc.enabled]
