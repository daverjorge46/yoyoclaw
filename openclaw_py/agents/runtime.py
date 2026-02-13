"""Agent runtime - simplified version for batch 7.

This module provides the core runtime for creating agent messages.
Full context management will be added in batch 8.
"""

from openclaw_py.config import ModelsConfig, OpenClawConfig
from openclaw_py.logging import log_debug, log_info

from .defaults import DEFAULT_MODEL, DEFAULT_PROVIDER
from .model_catalog import load_model_catalog
from .model_selection import parse_model_ref
from .providers import AnthropicProvider, LiteLLMProvider, OpenAIProvider
from .providers.base import BaseProvider
from .types import AgentMessage, AgentResponse, ProviderConfig


def get_provider_from_config(
    provider_name: str,
    config: OpenClawConfig | None = None,
) -> BaseProvider | None:
    """Get a provider instance from configuration.

    Args:
        provider_name: Provider identifier (e.g., "anthropic", "openai")
        config: OpenClaw configuration

    Returns:
        Provider instance or None if not configured

    Examples:
        >>> provider = get_provider_from_config("anthropic", config)
        >>> provider.name
        'anthropic'
    """
    if not config or not config.models or not config.models.providers:
        log_debug(f"No models configuration found for provider: {provider_name}")
        return None

    models_config: ModelsConfig = config.models
    provider_config_data = models_config.providers.get(provider_name)

    if not provider_config_data:
        log_debug(f"Provider not found in configuration: {provider_name}")
        return None

    # Create ProviderConfig
    provider_config = ProviderConfig(
        name=provider_name,
        base_url=provider_config_data.base_url,
        api_key=provider_config_data.api_key,
        timeout=120,  # TODO: make configurable
        max_retries=2,  # TODO: make configurable
        headers=provider_config_data.headers,
    )

    # Instantiate appropriate provider
    if provider_name == "anthropic":
        return AnthropicProvider(provider_config)
    elif provider_name == "openai":
        return OpenAIProvider(provider_config)
    else:
        # Use litellm for other providers (Google, etc.)
        return LiteLLMProvider(provider_config)


async def create_agent_message(
    messages: list[AgentMessage],
    model_ref: str | None = None,
    config: OpenClawConfig | None = None,
    stream: bool = False,
    **kwargs,
) -> AgentResponse:
    """Create an agent message (simplified version for batch 7).

    Args:
        messages: List of conversation messages
        model_ref: Model reference (provider/model or just model)
        config: OpenClaw configuration
        stream: Whether to use streaming (not implemented in this simplified version)
        **kwargs: Additional parameters for the provider

    Returns:
        AgentResponse with generated content

    Raises:
        ValueError: If provider not configured
        Exception: If API call fails

    Examples:
        >>> messages = [AgentMessage(role="user", content="Hello!")]
        >>> response = await create_agent_message(messages, "anthropic/claude-opus-4-6", config)
        >>> response.content
        'Hello! How can I assist you today?'
    """
    # Parse model reference
    parsed_ref = parse_model_ref(model_ref or DEFAULT_MODEL, DEFAULT_PROVIDER)
    if not parsed_ref:
        raise ValueError(f"Invalid model reference: {model_ref}")

    provider_name = parsed_ref.provider
    model_name = parsed_ref.model

    log_info(f"Creating agent message: provider={provider_name}, model={model_name}")

    # Get provider
    provider = get_provider_from_config(provider_name, config)
    if not provider:
        raise ValueError(
            f"Provider {provider_name} not configured. "
            "Please add it to your openclaw.yaml models.providers section."
        )

    # Create message
    if stream:
        # TODO: Implement streaming in batch 7
        # For now, fall back to non-streaming
        log_debug("Streaming requested but not yet implemented, using non-streaming")

    response = await provider.create_message(
        messages=messages,
        model=model_name,
        **kwargs,
    )

    log_info(
        f"Agent response received: {len(response.content)} chars, "
        f"usage={response.usage.total_tokens if response.usage else 0} tokens"
    )

    return response
