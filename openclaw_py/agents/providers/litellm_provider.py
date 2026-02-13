"""LiteLLM provider implementation.

This module uses litellm for unified access to multiple model providers.
"""

from typing import AsyncGenerator

import litellm

from openclaw_py.logging import log_debug, log_error

from ..defaults import DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE
from ..types import AgentMessage, AgentResponse, ProviderConfig, StreamChunk
from ..usage import normalize_usage
from .base import BaseProvider


class LiteLLMProvider(BaseProvider):
    """Provider using litellm for unified model access.

    Supports Google Gemini, Anthropic, OpenAI, and many others through litellm.
    """

    def __init__(self, config: ProviderConfig):
        """Initialize LiteLLM provider.

        Args:
            config: Provider configuration
        """
        super().__init__(config)

        # Configure litellm
        if config.api_key:
            litellm.api_key = config.api_key

        if config.base_url:
            litellm.api_base = config.base_url

        # Set timeout
        litellm.request_timeout = config.timeout

        log_debug(f"Initialized LiteLLM provider: {config.name}")

    def _convert_messages(self, messages: list[AgentMessage]) -> list[dict]:
        """Convert AgentMessage list to litellm format.

        Args:
            messages: List of AgentMessage objects

        Returns:
            List of litellm message dicts
        """
        return [{"role": msg.role, "content": msg.content} for msg in messages]

    async def create_message(
        self,
        messages: list[AgentMessage],
        model: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        system: str | None = None,
        **kwargs,
    ) -> AgentResponse:
        """Create a message using litellm (non-streaming).

        Args:
            messages: Conversation messages
            model: Model name (e.g., "gemini/gemini-pro")
            max_tokens: Max tokens to generate
            temperature: Sampling temperature
            system: System prompt (prepended as system message)
            **kwargs: Additional parameters

        Returns:
            AgentResponse with generated content

        Raises:
            Exception: If API call fails
        """
        try:
            # Convert messages
            litellm_messages = self._convert_messages(messages)

            # Prepend system message if provided
            if system:
                litellm_messages.insert(0, {"role": "system", "content": system})

            # Prepare request parameters
            request_params = {
                "model": model,
                "messages": litellm_messages,
            }

            if max_tokens:
                request_params["max_tokens"] = max_tokens

            if temperature is not None:
                request_params["temperature"] = temperature
            else:
                request_params["temperature"] = DEFAULT_TEMPERATURE

            # Add additional kwargs
            request_params.update(kwargs)

            log_debug(f"Calling litellm API: model={model}, messages={len(litellm_messages)}")

            # Make API call (litellm.acompletion is async)
            response = await litellm.acompletion(**request_params)

            # Extract content
            content = ""
            if response.choices:
                content = response.choices[0].message.content or ""

            # Normalize usage
            usage_info = None
            if hasattr(response, "usage") and response.usage:
                usage_info = normalize_usage(response.usage)

            finish_reason = None
            if response.choices:
                finish_reason = response.choices[0].finish_reason

            return AgentResponse(
                content=content,
                usage=usage_info,
                model=response.model if hasattr(response, "model") else model,
                finish_reason=finish_reason,
                raw_response=response,
            )

        except Exception as e:
            log_error(f"LiteLLM API error: {e}")
            raise

    async def create_message_stream(
        self,
        messages: list[AgentMessage],
        model: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        system: str | None = None,
        **kwargs,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Create a message with streaming.

        Args:
            messages: Conversation messages
            model: Model name
            max_tokens: Max tokens to generate
            temperature: Sampling temperature
            system: System prompt
            **kwargs: Additional parameters

        Yields:
            StreamChunk objects with delta content
        """
        try:
            # Convert messages
            litellm_messages = self._convert_messages(messages)

            # Prepend system message if provided
            if system:
                litellm_messages.insert(0, {"role": "system", "content": system})

            # Prepare request parameters
            request_params = {
                "model": model,
                "messages": litellm_messages,
                "stream": True,
            }

            if max_tokens:
                request_params["max_tokens"] = max_tokens

            if temperature is not None:
                request_params["temperature"] = temperature
            else:
                request_params["temperature"] = DEFAULT_TEMPERATURE

            # Add additional kwargs
            request_params.update(kwargs)

            log_debug(f"Calling litellm streaming API: model={model}")

            # Stream response
            response = await litellm.acompletion(**request_params)

            async for chunk in response:
                if hasattr(chunk, "choices") and chunk.choices:
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        yield StreamChunk(delta=delta.content)

                    # Check for finish
                    if hasattr(chunk.choices[0], "finish_reason") and chunk.choices[0].finish_reason:
                        yield StreamChunk(
                            delta="",
                            finish_reason=chunk.choices[0].finish_reason,
                        )

        except Exception as e:
            log_error(f"LiteLLM streaming error: {e}")
            raise
