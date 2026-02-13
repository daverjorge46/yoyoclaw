"""Model selection and normalization.

This module provides utilities for parsing and normalizing model references.
"""

from .defaults import DEFAULT_PROVIDER
from .types import ModelRef

# Model alias mapping
ANTHROPIC_MODEL_ALIASES = {
    "opus-4.6": "claude-opus-4-6",
    "opus-4.5": "claude-opus-4-5",
    "sonnet-4.5": "claude-sonnet-4-5",
    "sonnet-4": "claude-sonnet-4",
    "haiku-4.5": "claude-haiku-4-5",
}

OPENAI_MODEL_ALIASES = {
    "gpt-4": "gpt-4-turbo",
    "gpt-3.5": "gpt-3.5-turbo",
}


def normalize_provider_id(provider: str) -> str:
    """Normalize provider identifier.

    Args:
        provider: Provider name (case-insensitive)

    Returns:
        Normalized provider name

    Examples:
        >>> normalize_provider_id("Anthropic")
        'anthropic'
        >>> normalize_provider_id("Z.AI")
        'zai'
    """
    normalized = provider.strip().lower()

    # Special cases
    if normalized in ("z.ai", "z-ai"):
        return "zai"
    if normalized == "opencode-zen":
        return "opencode"
    if normalized == "qwen":
        return "qwen-portal"
    if normalized == "kimi-code":
        return "kimi-coding"

    return normalized


def normalize_model_id(provider: str, model: str) -> str:
    """Normalize model ID for a specific provider.

    Args:
        provider: Provider name
        model: Model identifier

    Returns:
        Normalized model identifier

    Examples:
        >>> normalize_model_id("anthropic", "opus-4.6")
        'claude-opus-4-6'
        >>> normalize_model_id("openai", "gpt-4")
        'gpt-4-turbo'
    """
    trimmed = model.strip()
    if not trimmed:
        return trimmed

    # Provider-specific normalization
    if provider == "anthropic":
        lower = trimmed.lower()
        return ANTHROPIC_MODEL_ALIASES.get(lower, trimmed)

    if provider == "openai":
        lower = trimmed.lower()
        return OPENAI_MODEL_ALIASES.get(lower, trimmed)

    return trimmed


def parse_model_ref(raw: str, default_provider: str = DEFAULT_PROVIDER) -> ModelRef | None:
    """Parse a model reference string.

    Supports formats:
    - "model_name" - uses default provider
    - "provider/model_name"

    Args:
        raw: Raw model reference string
        default_provider: Provider to use if none specified

    Returns:
        ModelRef or None if invalid

    Examples:
        >>> ref = parse_model_ref("claude-opus-4-6")
        >>> ref.provider
        'anthropic'
        >>> ref.model
        'claude-opus-4-6'

        >>> ref = parse_model_ref("openai/gpt-4")
        >>> ref.provider
        'openai'
        >>> ref.model
        'gpt-4-turbo'
    """
    trimmed = raw.strip()
    if not trimmed:
        return None

    # Check for provider/model format
    slash_index = trimmed.find("/")

    if slash_index == -1:
        # No slash - use default provider
        provider = normalize_provider_id(default_provider)
        model = normalize_model_id(provider, trimmed)
        return ModelRef(provider=provider, model=model)

    # Has slash - parse provider and model
    provider_raw = trimmed[:slash_index].strip()
    model_raw = trimmed[slash_index + 1 :].strip()

    if not provider_raw or not model_raw:
        return None

    provider = normalize_provider_id(provider_raw)
    model = normalize_model_id(provider, model_raw)

    return ModelRef(provider=provider, model=model)


def model_key(provider: str, model: str) -> str:
    """Create a unique key for a provider/model combination.

    Args:
        provider: Provider name
        model: Model name

    Returns:
        Key in format "provider/model"

    Examples:
        >>> model_key("anthropic", "claude-opus-4-6")
        'anthropic/claude-opus-4-6'
    """
    return f"{provider}/{model}"
