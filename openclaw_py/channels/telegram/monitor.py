"""Telegram bot monitoring and health checks.

This module provides monitoring and heartbeat functionality for Telegram bots.
"""

import asyncio
from typing import Any

from aiogram import Bot
from aiogram.types import User

from openclaw_py.config import OpenClawConfig
from openclaw_py.logging import log_debug, log_error, log_info, log_warn

from .accounts import list_enabled_telegram_accounts


async def monitor_telegram_provider(
    config: OpenClawConfig,
    interval_seconds: int = 60,
) -> None:
    """Monitor Telegram bot health with periodic heartbeat checks.

    Args:
        config: OpenClaw configuration
        interval_seconds: Heartbeat interval in seconds

    Examples:
        >>> await monitor_telegram_provider(config, interval_seconds=60)
    """
    log_info(f"Starting Telegram monitor (interval: {interval_seconds}s)")

    while True:
        try:
            await _check_telegram_health(config)
        except Exception as e:
            log_error(f"Telegram monitor check failed: {e}")

        # Wait for next interval
        await asyncio.sleep(interval_seconds)


async def _check_telegram_health(config: OpenClawConfig) -> None:
    """Check health of all enabled Telegram accounts.

    Args:
        config: OpenClaw configuration
    """
    accounts = list_enabled_telegram_accounts(config)

    if not accounts:
        log_warn("No enabled Telegram accounts found")
        return

    log_debug(f"Checking health for {len(accounts)} Telegram account(s)")

    for account in accounts:
        try:
            await _check_account_health(account.token, account.account_id)
        except Exception as e:
            log_error(
                f"Health check failed for account {account.account_id}: {e}",
                account_id=account.account_id,
            )


async def _check_account_health(token: str, account_id: str) -> None:
    """Check health of a single Telegram account.

    Args:
        token: Bot token
        account_id: Account ID
    """
    if not token:
        log_warn(f"No token for account {account_id}, skipping health check")
        return

    # Create temporary bot instance for health check
    bot = Bot(token=token)

    try:
        # Call getMe to verify bot is working
        me: User = await bot.get_me()

        log_debug(
            f"Telegram bot healthy: {account_id} (@{me.username})",
            account_id=account_id,
            bot_id=me.id,
            bot_username=me.username,
        )
    except Exception as e:
        log_error(
            f"Telegram bot health check failed: {account_id}: {e}",
            account_id=account_id,
        )
        raise
    finally:
        # Close bot session
        await bot.session.close()


async def get_telegram_bot_info(token: str) -> dict[str, Any]:
    """Get information about a Telegram bot.

    Args:
        token: Bot token

    Returns:
        Dict with bot information

    Examples:
        >>> info = await get_telegram_bot_info(token)
        >>> info["username"]
        'MyBot'
    """
    bot = Bot(token=token)

    try:
        me: User = await bot.get_me()

        return {
            "id": me.id,
            "username": me.username,
            "first_name": me.first_name,
            "is_bot": me.is_bot,
            "can_join_groups": me.can_join_groups,
            "can_read_all_group_messages": me.can_read_all_group_messages,
            "supports_inline_queries": me.supports_inline_queries,
        }
    finally:
        await bot.session.close()
