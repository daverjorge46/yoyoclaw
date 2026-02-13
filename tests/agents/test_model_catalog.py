"""Tests for model catalog."""

from openclaw_py.agents.model_catalog import (
    get_model_context_window,
    get_model_info,
    list_models,
    load_model_catalog,
)
from openclaw_py.agents.types import ModelInfo
from openclaw_py.config import (
    ModelDefinitionConfig,
    ModelProviderConfig,
    ModelsConfig,
    OpenClawConfig,
)


def test_load_model_catalog_empty():
    """Test loading model catalog with no configuration."""
    catalog = load_model_catalog(None)
    assert catalog == {}


def test_load_model_catalog_with_config():
    """Test loading model catalog from configuration."""
    # Create test configuration
    config = OpenClawConfig(
        models=ModelsConfig(
            providers={
                "anthropic": ModelProviderConfig(
                    base_url="https://api.anthropic.com",
                    api_key="test-key",
                    models=[
                        ModelDefinitionConfig(
                            id="claude-opus-4-6",
                            name="Claude Opus 4.6",
                            api="anthropic-messages",
                            context_window=200000,
                        ),
                    ],
                ),
            },
        ),
    )

    catalog = load_model_catalog(config)
    assert len(catalog) == 1
    assert "anthropic/claude-opus-4-6" in catalog

    info = catalog["anthropic/claude-opus-4-6"]
    assert info.id == "claude-opus-4-6"
    assert info.name == "Claude Opus 4.6"
    assert info.provider == "anthropic"
    assert info.context_window == 200000


def test_get_model_info():
    """Test getting model info from catalog."""
    config = OpenClawConfig(
        models=ModelsConfig(
            providers={
                "anthropic": ModelProviderConfig(
                    base_url="https://api.anthropic.com",
                    api_key="test-key",
                    models=[
                        ModelDefinitionConfig(
                            id="claude-opus-4-6",
                            name="Claude Opus 4.6",
                        ),
                    ],
                ),
            },
        ),
    )

    info = get_model_info("anthropic", "claude-opus-4-6", config=config)
    assert info is not None
    assert info.id == "claude-opus-4-6"

    # Non-existent model
    assert get_model_info("anthropic", "nonexistent", config=config) is None


def test_list_models():
    """Test listing models."""
    config = OpenClawConfig(
        models=ModelsConfig(
            providers={
                "anthropic": ModelProviderConfig(
                    base_url="https://api.anthropic.com",
                    api_key="test-key",
                    models=[
                        ModelDefinitionConfig(
                            id="claude-opus-4-6",
                            name="Claude Opus 4.6",
                        ),
                        ModelDefinitionConfig(
                            id="claude-sonnet-4-5",
                            name="Claude Sonnet 4.5",
                        ),
                    ],
                ),
                "openai": ModelProviderConfig(
                    base_url="https://api.openai.com",
                    api_key="test-key",
                    models=[
                        ModelDefinitionConfig(
                            id="gpt-4-turbo",
                            name="GPT-4 Turbo",
                        ),
                    ],
                ),
            },
        ),
    )

    # List all models
    all_models = list_models(config=config)
    assert len(all_models) == 3

    # List Anthropic models only
    anthropic_models = list_models(provider="anthropic", config=config)
    assert len(anthropic_models) == 2

    # List OpenAI models only
    openai_models = list_models(provider="openai", config=config)
    assert len(openai_models) == 1


def test_get_model_context_window():
    """Test getting model context window."""
    config = OpenClawConfig(
        models=ModelsConfig(
            providers={
                "anthropic": ModelProviderConfig(
                    base_url="https://api.anthropic.com",
                    api_key="test-key",
                    models=[
                        ModelDefinitionConfig(
                            id="claude-opus-4-6",
                            name="Claude Opus 4.6",
                            context_window=200000,
                        ),
                    ],
                ),
            },
        ),
    )

    # Known model
    window = get_model_context_window("anthropic", "claude-opus-4-6", config=config)
    assert window == 200000

    # Unknown model (should return default)
    from openclaw_py.agents.defaults import DEFAULT_CONTEXT_TOKENS

    window = get_model_context_window("anthropic", "unknown", config=config)
    assert window == DEFAULT_CONTEXT_TOKENS
