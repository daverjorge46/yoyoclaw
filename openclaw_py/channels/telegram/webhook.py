"""Telegram webhook server.

This module provides a webhook server for receiving Telegram updates
using aiohttp and aiogram's webhook handler.
"""

import asyncio
from typing import Callable

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

from openclaw_py.config import OpenClawConfig, load_config_file
from openclaw_py.logging import log_error, log_info

from .bot import create_telegram_bot


class TelegramWebhookServer:
    """Telegram webhook server.

    This class manages an aiohttp web server that receives Telegram updates
    via webhook and dispatches them to the bot handlers.
    """

    def __init__(
        self,
        bot: Bot,
        dispatcher: Dispatcher,
        path: str,
        health_path: str,
        secret: str | None = None,
    ):
        """Initialize webhook server.

        Args:
            bot: Aiogram Bot instance
            dispatcher: Aiogram Dispatcher instance
            path: Webhook endpoint path (e.g., "/telegram-webhook")
            health_path: Health check endpoint path (e.g., "/healthz")
            secret: Optional webhook secret token
        """
        self.bot = bot
        self.dispatcher = dispatcher
        self.path = path
        self.health_path = health_path
        self.secret = secret
        self.app = web.Application()
        self._runner: web.AppRunner | None = None
        self._site: web.TCPSite | None = None

        # Set up routes
        self._setup_routes()

    def _setup_routes(self) -> None:
        """Set up web application routes."""
        # Health check endpoint
        self.app.router.add_get(self.health_path, self._handle_health)

        # Webhook endpoint (configured by aiogram)
        webhook_handler = SimpleRequestHandler(
            dispatcher=self.dispatcher,
            bot=self.bot,
            secret_token=self.secret,
        )
        webhook_handler.register(self.app, path=self.path)

        setup_application(self.app, self.dispatcher, bot=self.bot)

    async def _handle_health(self, request: web.Request) -> web.Response:
        """Handle health check requests.

        Args:
            request: HTTP request

        Returns:
            HTTP response with "ok"
        """
        return web.Response(text="ok")

    async def start(
        self,
        host: str = "0.0.0.0",
        port: int = 8787,
        public_url: str | None = None,
    ) -> None:
        """Start the webhook server.

        Args:
            host: Host to bind to (default: 0.0.0.0)
            port: Port to bind to (default: 8787)
            public_url: Public URL for webhook registration

        Raises:
            Exception: If server fails to start
        """
        # Determine public URL
        if not public_url:
            display_host = "localhost" if host == "0.0.0.0" else host
            public_url = f"http://{display_host}:{port}{self.path}"

        # Register webhook with Telegram
        log_info(f"Setting Telegram webhook to: {public_url}")
        try:
            await self.bot.set_webhook(
                url=public_url,
                secret_token=self.secret,
                drop_pending_updates=True,
            )
        except Exception as e:
            log_error(f"Failed to set webhook: {e}")
            raise

        # Start aiohttp server
        self._runner = web.AppRunner(self.app)
        await self._runner.setup()

        self._site = web.TCPSite(self._runner, host, port)
        await self._site.start()

        log_info(f"Telegram webhook server listening on {host}:{port}")
        log_info(f"Webhook path: {self.path}")
        log_info(f"Health check path: {self.health_path}")

    async def stop(self) -> None:
        """Stop the webhook server."""
        log_info("Stopping Telegram webhook server")

        # Delete webhook
        try:
            await self.bot.delete_webhook(drop_pending_updates=True)
        except Exception as e:
            log_error(f"Failed to delete webhook: {e}")

        # Stop site
        if self._site:
            await self._site.stop()
            self._site = None

        # Cleanup runner
        if self._runner:
            await self._runner.cleanup()
            self._runner = None

        # Close bot session
        await self.bot.session.close()


async def start_telegram_webhook(
    token: str | None = None,
    account_id: str = "default",
    config: OpenClawConfig | None = None,
    path: str = "/telegram-webhook",
    health_path: str = "/healthz",
    port: int = 8787,
    host: str = "0.0.0.0",
    secret: str | None = None,
    public_url: str | None = None,
    abort_signal: asyncio.Event | None = None,
    on_startup: Callable[[], None] | None = None,
) -> TelegramWebhookServer:
    """Start Telegram webhook server.

    This is the main entry point for starting a webhook-based Telegram bot.

    Args:
        token: Telegram bot token (optional if in config)
        account_id: Account ID (default: "default")
        config: OpenClaw configuration
        path: Webhook endpoint path (default: "/telegram-webhook")
        health_path: Health check path (default: "/healthz")
        port: Server port (default: 8787)
        host: Server host (default: "0.0.0.0")
        secret: Webhook secret token (optional)
        public_url: Public webhook URL (optional, auto-generated if not provided)
        abort_signal: Optional event to signal shutdown
        on_startup: Optional callback to run after startup

    Returns:
        TelegramWebhookServer instance

    Raises:
        Exception: If server fails to start

    Examples:
        >>> server = await start_telegram_webhook(
        ...     token="bot_token",
        ...     port=8080,
        ...     public_url="https://example.com/webhook"
        ... )
        >>> # Server is now running
        >>> await server.stop()
    """
    # Load config if not provided
    if not config:
        config = load_config_file()

    # Create bot instance
    bot_instance = await create_telegram_bot(
        token=token,
        account_id=account_id,
        config=config,
    )

    # Create webhook server
    server = TelegramWebhookServer(
        bot=bot_instance.bot,
        dispatcher=bot_instance.dispatcher,
        path=path,
        health_path=health_path,
        secret=secret,
    )

    # Start server
    await server.start(host=host, port=port, public_url=public_url)

    # Run startup callback
    if on_startup:
        on_startup()

    # Wait for abort signal if provided
    if abort_signal:
        try:
            await abort_signal.wait()
        finally:
            await server.stop()

    return server
