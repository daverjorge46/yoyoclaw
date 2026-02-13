"""Telegram group migration handling.

When a Telegram group is upgraded to a supergroup, the chat ID changes.
This module provides utilities to migrate group configurations.
"""

from typing import Any, Literal, NamedTuple

from openclaw_py.config import OpenClawConfig
from openclaw_py.logging import log_info

MigrationScope = Literal["account", "global"]


class TelegramGroupMigrationResult(NamedTuple):
    """Result of group migration operation."""

    migrated: bool
    skipped_existing: bool
    scopes: list[MigrationScope]


def migrate_telegram_groups_in_place(
    groups: dict[str, Any] | None,
    old_chat_id: str,
    new_chat_id: str,
) -> dict[str, bool]:
    """Migrate a group configuration in place.

    Args:
        groups: Dictionary of group configurations
        old_chat_id: Old chat ID (before migration)
        new_chat_id: New chat ID (after migration)

    Returns:
        Dict with keys:
        - migrated: True if migration occurred
        - skipped_existing: True if new_chat_id already exists

    Examples:
        >>> groups = {"123": {"name": "Test Group"}}
        >>> result = migrate_telegram_groups_in_place(groups, "123", "456")
        >>> result["migrated"]
        True
        >>> "456" in groups
        True
        >>> "123" in groups
        False
    """
    if not groups:
        return {"migrated": False, "skipped_existing": False}

    if old_chat_id == new_chat_id:
        return {"migrated": False, "skipped_existing": False}

    if old_chat_id not in groups:
        return {"migrated": False, "skipped_existing": False}

    if new_chat_id in groups:
        return {"migrated": False, "skipped_existing": True}

    # Migrate the group config
    groups[new_chat_id] = groups[old_chat_id]
    del groups[old_chat_id]

    return {"migrated": True, "skipped_existing": False}


def resolve_account_groups(
    config: OpenClawConfig,
    account_id: str | None,
) -> dict[str, Any] | None:
    """Resolve groups config for a specific account.

    Args:
        config: OpenClaw configuration
        account_id: Telegram account ID

    Returns:
        Groups dictionary or None

    Examples:
        >>> groups = resolve_account_groups(config, "default")
        >>> groups is None or isinstance(groups, dict)
        True
    """
    if not account_id:
        return None

    normalized = account_id.strip().lower()

    # Safely access config.channels.telegram.accounts
    channels = getattr(config, "channels", None)
    if not channels:
        return None

    telegram_config = (
        channels.get("telegram")
        if isinstance(channels, dict)
        else getattr(channels, "telegram", None)
    )
    if not telegram_config:
        return None

    accounts = (
        telegram_config.accounts
        if hasattr(telegram_config, "accounts")
        else telegram_config.get("accounts")
        if isinstance(telegram_config, dict)
        else None
    )

    if not accounts or not isinstance(accounts, dict):
        return None

    # Try exact match first
    if normalized in accounts:
        account_config = accounts[normalized]
        groups = (
            getattr(account_config, "groups", None)
            if hasattr(account_config, "groups")
            else account_config.get("groups")
            if isinstance(account_config, dict)
            else None
        )
        if groups:
            return groups

    # Try case-insensitive match
    for key in accounts:
        if key.lower() == normalized:
            account_config = accounts[key]
            groups = (
                getattr(account_config, "groups", None)
                if hasattr(account_config, "groups")
                else account_config.get("groups")
                if isinstance(account_config, dict)
                else None
            )
            if groups:
                return groups

    return None


def migrate_telegram_group_config(
    config: OpenClawConfig,
    old_chat_id: str,
    new_chat_id: str,
    account_id: str | None = None,
) -> TelegramGroupMigrationResult:
    """Migrate Telegram group configuration.

    This migrates both account-specific and global group configurations.

    Args:
        config: OpenClaw configuration
        old_chat_id: Old chat ID (before supergroup upgrade)
        new_chat_id: New chat ID (after supergroup upgrade)
        account_id: Optional account ID to limit scope

    Returns:
        TelegramGroupMigrationResult with migration status

    Examples:
        >>> result = migrate_telegram_group_config(config, "123", "456", "default")
        >>> result.migrated
        True
        >>> "account" in result.scopes
        True
    """
    scopes: list[MigrationScope] = []
    migrated = False
    skipped_existing = False

    # Try account-specific migration
    account_groups = resolve_account_groups(config, account_id)
    if account_groups:
        result = migrate_telegram_groups_in_place(
            account_groups, old_chat_id, new_chat_id
        )
        if result["migrated"]:
            migrated = True
            scopes.append("account")
            log_info(
                f"Migrated Telegram group in account '{account_id}': {old_chat_id} -> {new_chat_id}"
            )
        if result["skipped_existing"]:
            skipped_existing = True

    # Try global migration
    channels = getattr(config, "channels", None)
    if channels:
        telegram_config = (
            channels.get("telegram")
            if isinstance(channels, dict)
            else getattr(channels, "telegram", None)
        )
        if telegram_config:
            global_groups = (
                telegram_config.groups
                if hasattr(telegram_config, "groups")
                else telegram_config.get("groups")
                if isinstance(telegram_config, dict)
                else None
            )

            if global_groups:
                result = migrate_telegram_groups_in_place(
                    global_groups, old_chat_id, new_chat_id
                )
                if result["migrated"]:
                    migrated = True
                    scopes.append("global")
                    log_info(
                        f"Migrated Telegram group in global config: {old_chat_id} -> {new_chat_id}"
                    )
                if result["skipped_existing"]:
                    skipped_existing = True

    return TelegramGroupMigrationResult(
        migrated=migrated,
        skipped_existing=skipped_existing,
        scopes=scopes,
    )
