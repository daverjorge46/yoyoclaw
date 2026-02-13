"""Telegram bot creation and initialization.

This module provides the main entry point for creating Telegram bots
using aiogram 3.x.
"""

import asyncio
from typing import Any

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import Update

from openclaw_py.config import OpenClawConfig, load_config_file
from openclaw_py.logging import log_error, log_info

from .accounts import resolve_telegram_account
from .types import TelegramBotOptions
from .updates import TelegramUpdateDedupe, create_telegram_update_dedupe


class TelegramBotInstance:
    """Telegram bot instance wrapper.

    This class wraps an aiogram Bot and Dispatcher, providing lifecycle
    management and update processing.
    """

    def __init__(
        self,
        bot: Bot,
        dispatcher: Dispatcher,
        account_id: str,
        config: OpenClawConfig,
        options: TelegramBotOptions,
    ):
        """Initialize Telegram bot instance.

        Args:
            bot: Aiogram Bot instance
            dispatcher: Aiogram Dispatcher instance
            account_id: Telegram account ID
            config: OpenClaw configuration
            options: Bot creation options
        """
        self.bot = bot
        self.dispatcher = dispatcher
        self.account_id = account_id
        self.config = config
        self.options = options
        self._dedupe = create_telegram_update_dedupe()
        self._running = False

    async def start_polling(self) -> None:
        """Start polling for updates.

        This starts the aiogram dispatcher in polling mode.
        """
        if self._running:
            log_error("Bot is already running")
            return

        self._running = True
        log_info(f"Starting Telegram bot polling for account: {self.account_id}")

        try:
            # Start dispatcher polling
            await self.dispatcher.start_polling(self.bot)
        except Exception as e:
            log_error(f"Error during bot polling: {e}")
            raise
        finally:
            self._running = False

    async def stop(self) -> None:
        """Stop the bot gracefully."""
        if not self._running:
            return

        log_info(f"Stopping Telegram bot for account: {self.account_id}")

        try:
            await self.dispatcher.stop_polling()
            await self.bot.session.close()
        except Exception as e:
            log_error(f"Error stopping bot: {e}")

        self._running = False

    def is_running(self) -> bool:
        """Check if bot is running."""
        return self._running


async def create_telegram_bot(
    token: str | None = None,
    account_id: str = "default",
    config: OpenClawConfig | None = None,
    **options: Any,
) -> TelegramBotInstance:
    """Create a Telegram bot instance.

    Args:
        token: Bot token (if None, will be resolved from config)
        account_id: Telegram account ID
        config: OpenClaw configuration (if None, will be loaded from file)
        **options: Additional bot options

    Returns:
        TelegramBotInstance ready to start polling

    Examples:
        >>> bot_instance = await create_telegram_bot(account_id="default")
        >>> await bot_instance.start_polling()

    Raises:
        ValueError: If token is not provided and cannot be resolved
    """
    # Load config if not provided
    if config is None:
        log_info("Loading OpenClaw configuration")
        config = await load_config_file()

    # Resolve account
    account = resolve_telegram_account(config, account_id)

    if not account.enabled:
        raise ValueError(f"Telegram account '{account_id}' is not enabled")

    # Get token
    bot_token = token or account.token
    if not bot_token:
        raise ValueError(
            f"No Telegram bot token found for account '{account_id}'. "
            "Please set TELEGRAM_BOT_TOKEN environment variable or configure in openclaw.yaml"
        )

    log_info(f"Creating Telegram bot for account: {account_id} (token source: {account.token_source})")

    # Create bot options
    bot_options = TelegramBotOptions(
        token=bot_token,
        account_id=account_id,
        **options,
    )

    # Create aiogram Bot
    bot = Bot(
        token=bot_token,
        default=DefaultBotProperties(
            parse_mode=ParseMode.MARKDOWN,  # Default to Markdown formatting
        ),
    )

    # Create Dispatcher
    dispatcher = Dispatcher()

    # Register handlers (simplified - full implementation in handlers.py)
    _register_basic_handlers(dispatcher, config, account.config, account_id)

    # Create bot instance
    bot_instance = TelegramBotInstance(
        bot=bot,
        dispatcher=dispatcher,
        account_id=account_id,
        config=config,
        options=bot_options,
    )

    log_info(f"Telegram bot created successfully for account: {account_id}")

    return bot_instance


def _register_basic_handlers(dispatcher: Dispatcher, config: OpenClawConfig, account_config: Any, account_id: str) -> None:
    """Register basic message handlers.

    This is a simplified version. Full handler registration is in handlers.py.

    Args:
        dispatcher: Aiogram Dispatcher
        config: OpenClaw configuration
        account_config: Telegram account configuration
        account_id: Account ID
    """
    from aiogram import F
    from aiogram.filters import Command
    from aiogram.types import Message

    from openclaw_py.logging import log_debug

    from .message_context import build_telegram_message_context

    @dispatcher.message(Command("start"))
    async def handle_start(message: Message):
        """Handle /start command."""
        log_debug(f"Received /start command from {message.from_user.id}")
        await message.reply("👋 Hello! I'm OpenClaw bot. Send me a message!")

    @dispatcher.message(Command("help"))
    async def handle_help(message: Message):
        """Handle /help command."""
        log_debug(f"Received /help command from {message.from_user.id}")
        help_text = (
            "🤖 *OpenClaw Bot*\n\n"
            "Available commands:\n"
            "/start - Start the bot\n"
            "/help - Show this help message\n"
            "/reset - Reset your session\n\n"
            "Just send me a message and I'll respond!"
        )
        await message.reply(help_text, parse_mode=ParseMode.MARKDOWN)

    @dispatcher.message(Command("reset"))
    async def handle_reset(message: Message):
        """Handle /reset command."""
        log_debug(f"Received /reset command from {message.from_user.id}")
        # TODO: Implement session reset
        await message.reply("✅ Session reset! Starting fresh.")

    @dispatcher.message(F.text)
    async def handle_text_message(message: Message):
        """Handle regular text messages."""
        log_debug(f"Received text message from {message.from_user.id}: {message.text[:50]}")

        # Build message context
        message_dict = message.model_dump()
        context = build_telegram_message_context(
            message=message_dict,
            account_id=account_id,
            config=config,
            account_config=account_config,
        )

        if not context:
            log_debug("Message context is None, skipping")
            return

        # TODO (batch 10 complete): Dispatch to agent
        # For now, just echo back
        await message.reply(f"Echo: {message.text}")


async def start_telegram_bot(
    account_id: str = "default",
    config: OpenClawConfig | None = None,
) -> TelegramBotInstance:
    """Create and start a Telegram bot.

    Convenience function that creates and starts polling in one call.

    Args:
        account_id: Telegram account ID
        config: OpenClaw configuration

    Returns:
        Running TelegramBotInstance
    """
    bot_instance = await create_telegram_bot(account_id=account_id, config=config)

    # Start polling in background task
    asyncio.create_task(bot_instance.start_polling())

    return bot_instance
