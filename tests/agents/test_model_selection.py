"""Tests for model selection."""

from openclaw_py.agents.defaults import DEFAULT_PROVIDER
from openclaw_py.agents.model_selection import (
    model_key,
    normalize_model_id,
    normalize_provider_id,
    parse_model_ref,
)


def test_normalize_provider_id():
    """Test provider ID normalization."""
    assert normalize_provider_id("Anthropic") == "anthropic"
    assert normalize_provider_id("OPENAI") == "openai"
    assert normalize_provider_id("  openai  ") == "openai"


def test_normalize_provider_id_special_cases():
    """Test special provider ID cases."""
    assert normalize_provider_id("Z.AI") == "zai"
    assert normalize_provider_id("z-ai") == "zai"
    assert normalize_provider_id("opencode-zen") == "opencode"
    assert normalize_provider_id("qwen") == "qwen-portal"


def test_normalize_model_id_anthropic():
    """Test Anthropic model ID normalization."""
    assert normalize_model_id("anthropic", "opus-4.6") == "claude-opus-4-6"
    assert normalize_model_id("anthropic", "sonnet-4.5") == "claude-sonnet-4-5"
    assert normalize_model_id("anthropic", "claude-opus-4-6") == "claude-opus-4-6"


def test_normalize_model_id_openai():
    """Test OpenAI model ID normalization."""
    assert normalize_model_id("openai", "gpt-4") == "gpt-4-turbo"
    assert normalize_model_id("openai", "gpt-4-turbo") == "gpt-4-turbo"


def test_parse_model_ref_simple():
    """Test parsing simple model reference."""
    ref = parse_model_ref("claude-opus-4-6")
    assert ref is not None
    assert ref.provider == "anthropic"  # Default provider
    assert ref.model == "claude-opus-4-6"


def test_parse_model_ref_with_provider():
    """Test parsing model reference with provider."""
    ref = parse_model_ref("openai/gpt-4")
    assert ref is not None
    assert ref.provider == "openai"
    assert ref.model == "gpt-4-turbo"  # Normalized


def test_parse_model_ref_with_alias():
    """Test parsing with Anthropic alias."""
    ref = parse_model_ref("anthropic/opus-4.6")
    assert ref is not None
    assert ref.provider == "anthropic"
    assert ref.model == "claude-opus-4-6"  # Expanded alias


def test_parse_model_ref_invalid():
    """Test parsing invalid model reference."""
    assert parse_model_ref("") is None
    assert parse_model_ref("  ") is None
    assert parse_model_ref("/") is None
    assert parse_model_ref("provider/") is None


def test_parse_model_ref_custom_default():
    """Test parsing with custom default provider."""
    ref = parse_model_ref("gpt-4", default_provider="openai")
    assert ref is not None
    assert ref.provider == "openai"
    assert ref.model == "gpt-4-turbo"


def test_model_key():
    """Test model key generation."""
    assert model_key("anthropic", "claude-opus-4-6") == "anthropic/claude-opus-4-6"
    assert model_key("openai", "gpt-4") == "openai/gpt-4"
