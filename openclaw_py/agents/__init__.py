"""Agent runtime system.

This module provides AI agent functionality including model selection,
provider implementations, and message creation.
"""

from .defaults import (
    DEFAULT_CONTEXT_TOKENS,
    DEFAULT_MAX_TOKENS,
    DEFAULT_MODEL,
    DEFAULT_PROVIDER,
    DEFAULT_TEMPERATURE,
)
from .model_catalog import (
    get_model_context_window,
    get_model_info,
    get_model_max_tokens,
    list_models,
    load_model_catalog,
)
from .model_selection import model_key, normalize_model_id, normalize_provider_id, parse_model_ref
from .providers import AnthropicProvider, BaseProvider, LiteLLMProvider, OpenAIProvider
from .runtime import create_agent_message, get_provider_from_config
from .types import (
    AgentMessage,
    AgentResponse,
    ModelInfo,
    ModelRef,
    ProviderConfig,
    StreamChunk,
    UsageInfo,
)
from .usage import derive_prompt_tokens, merge_usage, normalize_usage

__all__ = [
    # Defaults
    "DEFAULT_PROVIDER",
    "DEFAULT_MODEL",
    "DEFAULT_CONTEXT_TOKENS",
    "DEFAULT_MAX_TOKENS",
    "DEFAULT_TEMPERATURE",
    # Types
    "ModelRef",
    "UsageInfo",
    "AgentMessage",
    "AgentResponse",
    "StreamChunk",
    "ModelInfo",
    "ProviderConfig",
    # Model catalog
    "load_model_catalog",
    "get_model_info",
    "list_models",
    "get_model_context_window",
    "get_model_max_tokens",
    # Model selection
    "parse_model_ref",
    "normalize_provider_id",
    "normalize_model_id",
    "model_key",
    # Usage
    "normalize_usage",
    "derive_prompt_tokens",
    "merge_usage",
    # Providers
    "BaseProvider",
    "AnthropicProvider",
    "OpenAIProvider",
    "LiteLLMProvider",
    # Runtime
    "get_provider_from_config",
    "create_agent_message",
]
