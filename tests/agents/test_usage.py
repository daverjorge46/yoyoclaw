"""Tests for usage normalization."""

from openclaw_py.agents.types import UsageInfo
from openclaw_py.agents.usage import derive_prompt_tokens, merge_usage, normalize_usage


def test_normalize_usage_anthropic_format():
    """Test normalization of Anthropic usage format."""
    raw = {
        "input_tokens": 100,
        "output_tokens": 50,
        "cache_read_input_tokens": 10,
        "cache_creation_input_tokens": 5,
    }

    usage = normalize_usage(raw)
    assert usage is not None
    assert usage.input_tokens == 100
    assert usage.output_tokens == 50
    assert usage.cache_read_tokens == 10
    assert usage.cache_creation_tokens == 5
    assert usage.total_tokens == 165  # Auto-calculated


def test_normalize_usage_openai_format():
    """Test normalization of OpenAI usage format."""
    raw = {
        "prompt_tokens": 100,
        "completion_tokens": 50,
        "total_tokens": 150,
    }

    usage = normalize_usage(raw)
    assert usage is not None
    assert usage.input_tokens == 100
    assert usage.output_tokens == 50
    assert usage.total_tokens == 150


def test_normalize_usage_empty():
    """Test normalization of empty/None usage."""
    assert normalize_usage(None) is None
    assert normalize_usage({}) is None
    assert normalize_usage({"invalid": 123}) is None


def test_normalize_usage_mixed_formats():
    """Test normalization with mixed naming."""
    raw = {
        "inputTokens": 100,  # Camel case
        "output_tokens": 50,  # Snake case
    }

    usage = normalize_usage(raw)
    assert usage is not None
    assert usage.input_tokens == 100
    assert usage.output_tokens == 50


def test_derive_prompt_tokens():
    """Test deriving prompt tokens."""
    usage = UsageInfo(
        input_tokens=100,
        cache_read_tokens=10,
        cache_creation_tokens=5,
    )

    prompt_tokens = derive_prompt_tokens(usage)
    assert prompt_tokens == 115


def test_derive_prompt_tokens_none():
    """Test deriving prompt tokens from None."""
    assert derive_prompt_tokens(None) is None


def test_merge_usage():
    """Test merging usage info."""
    usage1 = UsageInfo(
        input_tokens=100,
        output_tokens=50,
    )

    usage2 = UsageInfo(
        input_tokens=200,
        output_tokens=100,
        cache_read_tokens=10,
    )

    merged = merge_usage(usage1, usage2)
    assert merged is not None
    assert merged.input_tokens == 300
    assert merged.output_tokens == 150
    assert merged.cache_read_tokens == 10


def test_merge_usage_with_none():
    """Test merging with None."""
    usage = UsageInfo(input_tokens=100)

    assert merge_usage(None, None) is None
    assert merge_usage(usage, None) == usage
    assert merge_usage(None, usage) == usage
