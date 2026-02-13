"""Tests for base provider."""

import pytest

from openclaw_py.agents.providers.base import BaseProvider
from openclaw_py.agents.types import AgentMessage, AgentResponse, ProviderConfig


class MockProvider(BaseProvider):
    """Mock provider for testing."""

    async def create_message(
        self,
        messages,
        model,
        max_tokens=None,
        temperature=None,
        system=None,
        **kwargs,
    ):
        return AgentResponse(content="Mock response", model=model)


def test_base_provider_initialization():
    """Test base provider initialization."""
    config = ProviderConfig(name="mock", api_key="test")
    provider = MockProvider(config)

    assert provider.name == "mock"
    assert provider.config == config


def test_base_provider_supports_streaming():
    """Test streaming support check."""
    config = ProviderConfig(name="mock", api_key="test")
    provider = MockProvider(config)

    # Mock provider doesn't implement streaming
    assert not provider.supports_streaming()


@pytest.mark.asyncio
async def test_base_provider_stream_not_implemented():
    """Test that streaming raises NotImplementedError by default."""
    config = ProviderConfig(name="mock", api_key="test")
    provider = MockProvider(config)

    messages = [AgentMessage(role="user", content="Hello")]

    # create_message_stream raises NotImplementedError when we try to iterate
    with pytest.raises(NotImplementedError, match="Streaming not supported"):
        async for _ in provider.create_message_stream(messages, "test-model"):
            pass
