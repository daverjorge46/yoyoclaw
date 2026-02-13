"""Anthropic Claude provider implementation.

This module implements the Anthropic API using the official anthropic SDK.
"""

from typing import AsyncGenerator

import anthropic

from openclaw_py.logging import log_debug, log_error

from ..defaults import DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE
from ..types import AgentMessage, AgentResponse, ProviderConfig, StreamChunk, UsageInfo
from ..usage import normalize_usage
from .base import BaseProvider


class AnthropicProvider(BaseProvider):
    """Provider for Anthropic Claude models.

    Uses the official anthropic SDK for API calls.
    Supports streaming and prompt caching.
    """

    def __init__(self, config: ProviderConfig):
        """Initialize Anthropic provider.

        Args:
            config: Provider configuration with api_key
        """
        super().__init__(config)

        if not config.api_key:
            raise ValueError("Anthropic provider requires api_key")

        # Initialize Anthropic client
        self.client = anthropic.AsyncAnthropic(
            api_key=config.api_key,
            base_url=config.base_url if config.base_url else None,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )

        log_debug(f"Initialized Anthropic provider: {config.name}")

    def _convert_messages(
        self, messages: list[AgentMessage]
    ) -> tuple[str | None, list[dict]]:
        """Convert AgentMessage list to Anthropic format.

        Extracts system message and converts to Anthropic message format.

        Args:
            messages: List of AgentMessage objects

        Returns:
            Tuple of (system_prompt, anthropic_messages)
        """
        system_prompt: str | None = None
        anthropic_messages: list[dict] = []

        for msg in messages:
            if msg.role == "system":
                # Anthropic uses separate system parameter
                if system_prompt:
                    system_prompt += "\n\n" + msg.content
                else:
                    system_prompt = msg.content
            else:
                anthropic_messages.append(
                    {
                        "role": msg.role,
                        "content": msg.content,
                    }
                )

        return system_prompt, anthropic_messages

    async def create_message(
        self,
        messages: list[AgentMessage],
        model: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        system: str | None = None,
        **kwargs,
    ) -> AgentResponse:
        """Create a message using Anthropic API (non-streaming).

        Args:
            messages: Conversation messages
            model: Model name (e.g., "claude-opus-4-6")
            max_tokens: Max tokens to generate
            temperature: Sampling temperature
            system: System prompt (overrides system messages)
            **kwargs: Additional Anthropic-specific parameters

        Returns:
            AgentResponse with generated content

        Raises:
            anthropic.APIError: If API call fails
        """
        try:
            # Extract system prompt and convert messages
            extracted_system, anthropic_messages = self._convert_messages(messages)
            final_system = system or extracted_system

            # Prepare request parameters
            request_params = {
                "model": model,
                "messages": anthropic_messages,
                "max_tokens": max_tokens or DEFAULT_MAX_TOKENS,
            }

            if final_system:
                request_params["system"] = final_system

            if temperature is not None:
                request_params["temperature"] = temperature
            else:
                request_params["temperature"] = DEFAULT_TEMPERATURE

            # Add additional kwargs
            request_params.update(kwargs)

            log_debug(f"Calling Anthropic API: model={model}, messages={len(anthropic_messages)}")

            # Make API call
            response = await self.client.messages.create(**request_params)

            # Extract content
            content = ""
            if response.content:
                for block in response.content:
                    if hasattr(block, "text"):
                        content += block.text

            # Normalize usage
            usage_info = None
            if response.usage:
                usage_info = normalize_usage(response.usage.model_dump())

            return AgentResponse(
                content=content,
                usage=usage_info,
                model=response.model,
                finish_reason=response.stop_reason,
                raw_response=response,
            )

        except anthropic.APIError as e:
            log_error(f"Anthropic API error: {e}")
            raise
        except Exception as e:
            log_error(f"Unexpected error calling Anthropic: {e}")
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
            # Extract system prompt and convert messages
            extracted_system, anthropic_messages = self._convert_messages(messages)
            final_system = system or extracted_system

            # Prepare request parameters
            request_params = {
                "model": model,
                "messages": anthropic_messages,
                "max_tokens": max_tokens or DEFAULT_MAX_TOKENS,
                "stream": True,
            }

            if final_system:
                request_params["system"] = final_system

            if temperature is not None:
                request_params["temperature"] = temperature
            else:
                request_params["temperature"] = DEFAULT_TEMPERATURE

            # Add additional kwargs
            request_params.update(kwargs)

            log_debug(f"Calling Anthropic streaming API: model={model}")

            # Stream response
            accumulated_usage: UsageInfo | None = None

            async with self.client.messages.stream(**request_params) as stream:
                async for event in stream:
                    # Handle different event types
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            yield StreamChunk(delta=event.delta.text)

                    elif event.type == "message_delta":
                        # Update usage if available
                        if hasattr(event, "usage") and event.usage:
                            usage_data = normalize_usage(event.usage.model_dump())
                            if usage_data:
                                accumulated_usage = usage_data

                    elif event.type == "message_stop":
                        # Final event with usage
                        if accumulated_usage:
                            yield StreamChunk(delta="", usage=accumulated_usage)

        except anthropic.APIError as e:
            log_error(f"Anthropic streaming API error: {e}")
            raise
        except Exception as e:
            log_error(f"Unexpected error in Anthropic streaming: {e}")
            raise
