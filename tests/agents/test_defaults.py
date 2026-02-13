"""Tests for default configuration values."""

from openclaw_py.agents.defaults import (
    DEFAULT_CONTEXT_TOKENS,
    DEFAULT_MAX_TOKENS,
    DEFAULT_MODEL,
    DEFAULT_PROVIDER,
    DEFAULT_TEMPERATURE,
)


def test_default_provider():
    """Test default provider."""
    assert DEFAULT_PROVIDER == "anthropic"


def test_default_model():
    """Test default model."""
    assert DEFAULT_MODEL == "claude-sonnet-4-5"


def test_default_context_tokens():
    """Test default context tokens."""
    assert DEFAULT_CONTEXT_TOKENS == 200_000


def test_default_max_tokens():
    """Test default max tokens."""
    assert DEFAULT_MAX_TOKENS == 4096


def test_default_temperature():
    """Test default temperature."""
    assert DEFAULT_TEMPERATURE == 1.0
