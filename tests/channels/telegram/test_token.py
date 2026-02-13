"""Tests for Telegram token resolution."""

import os
import tempfile
from pathlib import Path

import pytest

from openclaw_py.channels.telegram.token import TokenResolution, resolve_telegram_token
from openclaw_py.config import OpenClawConfig, TelegramAccountConfig, TelegramConfig


class TestResolveTelegramToken:
    """Tests for resolve_telegram_token."""

    def test_env_default_account(self, monkeypatch):
        """Test resolving token from env for default account."""
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123:ABC")

        config = OpenClawConfig()
        resolution = resolve_telegram_token(config, "default")

        assert resolution.token == "123:ABC"
        assert resolution.source == "env"

    def test_env_named_account(self, monkeypatch):
        """Test resolving token from env for named account."""
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN_MYBOT", "456:DEF")

        config = OpenClawConfig()
        resolution = resolve_telegram_token(config, "mybot")

        assert resolution.token == "456:DEF"
        assert resolution.source == "env"

    def test_config_account_token(self):
        """Test resolving token from account config."""
        config = OpenClawConfig(
            channels={
                "telegram": TelegramConfig(
                    accounts={
                        "default": TelegramAccountConfig(bot_token="789:GHI"),
                    },
                ),
            },
        )

        resolution = resolve_telegram_token(config, "default")

        assert resolution.token == "789:GHI"
        assert resolution.source == "config"

    def test_config_global_token(self):
        """Test resolving token from global telegram config."""
        config = OpenClawConfig(
            channels={
                "telegram": TelegramConfig(bot_token="999:XYZ"),
            },
        )

        resolution = resolve_telegram_token(config, "default")

        assert resolution.token == "999:XYZ"
        assert resolution.source == "config"

    def test_token_file(self, tmp_path):
        """Test resolving token from token file."""
        # Create token file
        token_file = tmp_path / "bot_token.txt"
        token_file.write_text("111:FILE")

        config = OpenClawConfig(
            channels={
                "telegram": TelegramConfig(
                    accounts={
                        "default": TelegramAccountConfig(token_file=str(token_file)),
                    },
                ),
            },
        )

        resolution = resolve_telegram_token(config, "default")

        assert resolution.token == "111:FILE"
        assert resolution.source == "tokenFile"

    def test_no_token_found(self):
        """Test when no token is found."""
        config = OpenClawConfig()

        resolution = resolve_telegram_token(config, "default")

        assert resolution.token == ""
        assert resolution.source == "none"

    def test_priority_env_over_config(self, monkeypatch):
        """Test env token has priority over config."""
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "ENV:TOKEN")

        config = OpenClawConfig(
            channels={
                "telegram": TelegramConfig(bot_token="CONFIG:TOKEN"),
            },
        )

        resolution = resolve_telegram_token(config, "default")

        # Env should win
        assert resolution.token == "ENV:TOKEN"
        assert resolution.source == "env"

    def test_token_file_not_exists(self):
        """Test token file that doesn't exist."""
        config = OpenClawConfig(
            channels={
                "telegram": TelegramConfig(
                    accounts={
                        "default": TelegramAccountConfig(token_file="/nonexistent/token.txt"),
                    },
                ),
            },
        )

        resolution = resolve_telegram_token(config, "default")

        # Should fall back to global config if available
        assert resolution.source in ["config", "none"]
