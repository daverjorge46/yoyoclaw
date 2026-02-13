"""OpenAI provider implementation.

This module implements the OpenAI API using the official openai SDK.
"""

from typing import AsyncGenerator

import openai

from openclaw_py.logging import log_debug, log_error

from ..defaults import DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE
from ..types import AgentMessage, AgentResponse, ProviderConfig, StreamChunk
from ..usage import normalize_usage
from .base import BaseProvider


class OpenAIProvider(BaseProvider):
    """Provider for OpenAI models (GPT-4, GPT-3.5, etc.).

    Uses the official openai SDK for API calls.
    Supports streaming.
    """

    def __init__(self, config: ProviderConfig):
        """Initialize OpenAI provider.

        Args:
            config: Provider configuration with api_key
        """
        super().__init__(config)

        if not config.api_key:
            raise ValueError("OpenAI provider requires api_key")

        # Initialize OpenAI client
        self.client = openai.AsyncOpenAI(
            api_key=config.api_key,
            base_url=config.base_url if config.base_url else None,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )

        log_debug(f"Initialized OpenAI provider: {config.name}")

    def _convert_messages(self, messages: list[AgentMessage]) -> list[dict]:
        """Convert AgentMessage list to OpenAI format.

        Args:
            messages: List of AgentMessage objects

        Returns:
            List of OpenAI message dicts
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
        """Create a message using OpenAI API (non-streaming).

        Args:
            messages: Conversation messages
            model: Model name (e.g., "gpt-4-turbo")
            max_tokens: Max tokens to generate
            temperature: Sampling temperature
            system: System prompt (prepended as system message)
            **kwargs: Additional OpenAI-specific parameters

        Returns:
            AgentResponse with generated content

        Raises:
            openai.APIError: If API call fails
        """
        try:
            # Convert messages
            openai_messages = self._convert_messages(messages)

            # Prepend system message if provided
            if system:
                openai_messages.insert(0, {"role": "system", "content": system})

            # Prepare request parameters
            request_params = {
                "model": model,
                "messages": openai_messages,
            }

            if max_tokens:
                request_params["max_tokens"] = max_tokens

            if temperature is not None:
                request_params["temperature"] = temperature
            else:
                request_params["temperature"] = DEFAULT_TEMPERATURE

            # Add additional kwargs
            request_params.update(kwargs)

            log_debug(f"Calling OpenAI API: model={model}, messages={len(openai_messages)}")

            # Make API call
            response = await self.client.chat.completions.create(**request_params)

            # Extract content
            content = ""
            if response.choices:
                content = response.choices[0].message.content or ""

            # Normalize usage
            usage_info = None
            if response.usage:
                usage_info = normalize_usage(response.usage.model_dump())

            finish_reason = None
            if response.choices:
                finish_reason = response.choices[0].finish_reason

            return AgentResponse(
                content=content,
                usage=usage_info,
                model=response.model,
                finish_reason=finish_reason,
                raw_response=response,
            )

        except openai.APIError as e:
            log_error(f"OpenAI API error: {e}")
            raise
        except Exception as e:
            log_error(f"Unexpected error calling OpenAI: {e}")
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
            openai_messages = self._convert_messages(messages)

            # Prepend system message if provided
            if system:
                openai_messages.insert(0, {"role": "system", "content": system})

            # Prepare request parameters
            request_params = {
                "model": model,
                "messages": openai_messages,
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

            log_debug(f"Calling OpenAI streaming API: model={model}")

            # Stream response
            stream = await self.client.chat.completions.create(**request_params)

            async for chunk in stream:
                if chunk.choices:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield StreamChunk(delta=delta.content)

                    # Check for finish
                    if chunk.choices[0].finish_reason:
                        # Note: OpenAI doesn't provide usage in streaming
                        yield StreamChunk(
                            delta="",
                            finish_reason=chunk.choices[0].finish_reason,
                        )

        except openai.APIError as e:
            log_error(f"OpenAI streaming API error: {e}")
            raise
        except Exception as e:
            log_error(f"Unexpected error in OpenAI streaming: {e}")
            raise
