"""Tests for agent scope resolution."""

import pytest

from openclaw_py.config.types import AgentConfig, AgentsConfig, OpenClawConfig
from openclaw_py.routing.agent_scope import (
    list_agent_ids,
    resolve_default_agent_id,
    resolve_session_agent_id,
    resolve_session_agent_ids,
)


class TestListAgentIds:
    """Test agent ID listing."""

    def test_list_agent_ids_empty_config(self):
        cfg = OpenClawConfig()
        assert list_agent_ids(cfg) == ["main"]

    def test_list_agent_ids_single_agent(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main"),
                ]
            )
        )
        assert list_agent_ids(cfg) == ["main"]

    def test_list_agent_ids_multiple_agents(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main"),
                    AgentConfig(id="helper"),
                    AgentConfig(id="research"),
                ]
            )
        )
        assert list_agent_ids(cfg) == ["main", "helper", "research"]

    def test_list_agent_ids_duplicate_ids(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main"),
                    AgentConfig(id="main"),  # Duplicate
                    AgentConfig(id="helper"),
                ]
            )
        )
        # Should deduplicate
        assert list_agent_ids(cfg) == ["main", "helper"]

    def test_list_agent_ids_case_insensitive(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="Main"),
                    AgentConfig(id="HELPER"),
                ]
            )
        )
        # Should normalize to lowercase
        assert list_agent_ids(cfg) == ["main", "helper"]


class TestResolveDefaultAgentId:
    """Test default agent ID resolution."""

    def test_resolve_default_agent_id_empty_config(self):
        cfg = OpenClawConfig()
        assert resolve_default_agent_id(cfg) == "main"

    def test_resolve_default_agent_id_no_default_flag(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="first"),
                    AgentConfig(id="second"),
                ]
            )
        )
        # Should return first agent
        assert resolve_default_agent_id(cfg) == "first"

    def test_resolve_default_agent_id_with_default_flag(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="first"),
                    AgentConfig(id="second", default=True),
                ]
            )
        )
        assert resolve_default_agent_id(cfg) == "second"

    def test_resolve_default_agent_id_multiple_defaults(self, capsys):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="first", default=True),
                    AgentConfig(id="second", default=True),
                ]
            )
        )
        result = resolve_default_agent_id(cfg)
        assert result == "first"

        # Should warn about multiple defaults (only once)
        captured = capsys.readouterr()
        assert "Multiple agents marked default=true" in captured.out

        # Second call should not warn again
        resolve_default_agent_id(cfg)
        captured = capsys.readouterr()
        assert "Multiple agents marked default=true" not in captured.out


class TestResolveSessionAgentIds:
    """Test session agent ID resolution."""

    def test_resolve_session_agent_ids_no_session_key(self):
        result = resolve_session_agent_ids()
        assert result["default_agent_id"] == "main"
        assert result["session_agent_id"] == "main"

    def test_resolve_session_agent_ids_with_session_key(self):
        result = resolve_session_agent_ids(session_key="agent:custom:main")
        assert result["default_agent_id"] == "main"
        assert result["session_agent_id"] == "custom"

    def test_resolve_session_agent_ids_with_config(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="primary", default=True),
                    AgentConfig(id="secondary"),
                ]
            )
        )
        result = resolve_session_agent_ids(session_key="agent:secondary:main", config=cfg)
        assert result["default_agent_id"] == "primary"
        assert result["session_agent_id"] == "secondary"

    def test_resolve_session_agent_ids_invalid_session_key(self):
        result = resolve_session_agent_ids(session_key="invalid")
        assert result["default_agent_id"] == "main"
        assert result["session_agent_id"] == "main"


class TestResolveSessionAgentId:
    """Test session agent ID resolution (simplified)."""

    def test_resolve_session_agent_id(self):
        assert resolve_session_agent_id(session_key="agent:custom:main") == "custom"
        assert resolve_session_agent_id(session_key="invalid") == "main"
        assert resolve_session_agent_id(session_key=None) == "main"

    def test_resolve_session_agent_id_with_config(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="primary", default=True),
                ]
            )
        )
        assert resolve_session_agent_id(session_key=None, config=cfg) == "primary"
