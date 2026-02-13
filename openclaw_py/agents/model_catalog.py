"""Model catalog management.

This module loads and manages the model catalog from configuration.
"""

from openclaw_py.config import ModelsConfig, OpenClawConfig
from openclaw_py.logging import log_debug, log_info

from .defaults import DEFAULT_CONTEXT_TOKENS, DEFAULT_MAX_TOKENS
from .model_selection import model_key, normalize_provider_id
from .types import ModelInfo


def load_model_catalog(config: OpenClawConfig | None = None) -> dict[str, ModelInfo]:
    """Load model catalog from configuration.

    Args:
        config: OpenClaw configuration (uses defaults if None)

    Returns:
        Dictionary mapping model keys (provider/model) to ModelInfo

    Examples:
        >>> catalog = load_model_catalog(config)
        >>> info = catalog.get("anthropic/claude-opus-4-6")
        >>> info.name
        'Claude Opus 4.6'
    """
    catalog: dict[str, ModelInfo] = {}

    if not config or not config.models or not config.models.providers:
        log_debug("No models configuration found, using empty catalog")
        return catalog

    models_config: ModelsConfig = config.models

    # Iterate through providers
    for provider_name, provider_config in models_config.providers.items():
        normalized_provider = normalize_provider_id(provider_name)

        # Iterate through models in this provider
        for model_def in provider_config.models:
            model_id = model_def.id
            model_name = model_def.name

            # Determine API type
            api_type = model_def.api or provider_config.api

            # Create ModelInfo
            info = ModelInfo(
                id=model_id,
                name=model_name,
                provider=normalized_provider,
                context_window=model_def.context_window,
                max_tokens=model_def.max_tokens,
                api_type=api_type,  # type: ignore
            )

            # Add to catalog with provider/model key
            key = model_key(normalized_provider, model_id)
            catalog[key] = info

            log_debug(f"Loaded model: {key} ({model_name})")

    log_info(f"Loaded {len(catalog)} models from configuration")
    return catalog


def get_model_info(
    provider: str,
    model: str,
    catalog: dict[str, ModelInfo] | None = None,
    config: OpenClawConfig | None = None,
) -> ModelInfo | None:
    """Get model information from catalog.

    Args:
        provider: Provider name
        model: Model ID
        catalog: Pre-loaded catalog (will load from config if None)
        config: Configuration to load catalog from

    Returns:
        ModelInfo if found, None otherwise

    Examples:
        >>> info = get_model_info("anthropic", "claude-opus-4-6", config=config)
        >>> info.context_window
        200000
    """
    if catalog is None:
        catalog = load_model_catalog(config)

    key = model_key(provider, model)
    return catalog.get(key)


def list_models(
    provider: str | None = None,
    catalog: dict[str, ModelInfo] | None = None,
    config: OpenClawConfig | None = None,
) -> list[ModelInfo]:
    """List available models, optionally filtered by provider.

    Args:
        provider: Provider to filter by (None for all)
        catalog: Pre-loaded catalog
        config: Configuration to load catalog from

    Returns:
        List of ModelInfo objects

    Examples:
        >>> models = list_models(provider="anthropic", config=config)
        >>> len(models) > 0
        True
    """
    if catalog is None:
        catalog = load_model_catalog(config)

    if provider is None:
        return list(catalog.values())

    normalized_provider = normalize_provider_id(provider)
    return [info for info in catalog.values() if info.provider == normalized_provider]


def get_model_context_window(
    provider: str,
    model: str,
    catalog: dict[str, ModelInfo] | None = None,
    config: OpenClawConfig | None = None,
) -> int:
    """Get context window size for a model.

    Args:
        provider: Provider name
        model: Model ID
        catalog: Pre-loaded catalog
        config: Configuration

    Returns:
        Context window in tokens (or DEFAULT_CONTEXT_TOKENS if unknown)
    """
    info = get_model_info(provider, model, catalog, config)
    if info and info.context_window:
        return info.context_window
    return DEFAULT_CONTEXT_TOKENS


def get_model_max_tokens(
    provider: str,
    model: str,
    catalog: dict[str, ModelInfo] | None = None,
    config: OpenClawConfig | None = None,
) -> int:
    """Get max output tokens for a model.

    Args:
        provider: Provider name
        model: Model ID
        catalog: Pre-loaded catalog
        config: Configuration

    Returns:
        Max tokens (or DEFAULT_MAX_TOKENS if unknown)
    """
    info = get_model_info(provider, model, catalog, config)
    if info and info.max_tokens:
        return info.max_tokens
    return DEFAULT_MAX_TOKENS
