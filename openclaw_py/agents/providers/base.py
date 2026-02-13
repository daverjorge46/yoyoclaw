"""Base provider interface.

This module defines the abstract base class for AI model providers.
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator

from ..types import AgentMessage, AgentResponse, ProviderConfig, StreamChunk


class BaseProvider(ABC):
    """Abstract base class for AI model providers.

    All providers must implement create_message() and optionally create_message_stream().
    """

    def __init__(self, config: ProviderConfig):
        """Initialize provider with configuration.

        Args:
            config: Provider configuration
        """
        self.config = config
        self.name = config.name

    @abstractmethod
    async def create_message(
        self,
        messages: list[AgentMessage],
        model: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        system: str | None = None,
        **kwargs,
    ) -> AgentResponse:
        """Create a message (non-streaming).

        Args:
            messages: List of conversation messages
            model: Model identifier
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-2.0)
            system: System prompt
            **kwargs: Additional provider-specific parameters

        Returns:
            AgentResponse with generated content

        Raises:
            Exception: If API call fails
        """
        pass

    async def create_message_stream(
        self,
        messages: list[AgentMessage],
        model: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        system: str | None = None,
        **kwargs,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Create a message with streaming (optional).

        Args:
            messages: List of conversation messages
            model: Model identifier
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-2.0)
            system: System prompt
            **kwargs: Additional provider-specific parameters

        Yields:
            StreamChunk objects with delta content

        Raises:
            NotImplementedError: If streaming not supported
            Exception: If API call fails
        """
        # Make this an actual async generator by using yield
        raise NotImplementedError(f"Streaming not supported for {self.name}")
        yield  # Unreachable, but makes this an async generator

    def supports_streaming(self) -> bool:
        """Check if this provider supports streaming.

        Returns:
            True if streaming is supported
        """
        # Check if create_message_stream is implemented
        try:
            # Get the method from the class
            method = self.__class__.create_message_stream
            # Check if it's not the base class implementation
            return method is not BaseProvider.create_message_stream
        except AttributeError:
            return False
