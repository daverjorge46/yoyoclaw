"""OpenClaw channels module.

This module provides channel integrations for OpenClaw.
Currently supports: Telegram
"""

# Telegram channel
from . import telegram

__all__ = [
    "telegram",
]
