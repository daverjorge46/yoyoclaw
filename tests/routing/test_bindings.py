"""Tests for agent binding management."""

import pytest

from openclaw_py.config.types import (
    AgentBinding,
    AgentBindingMatch,
    AgentConfig,
    AgentsConfig,
    OpenClawConfig,
)
from openclaw_py.routing.bindings import (
    build_channel_account_bindings,
    list_bindings,
    list_bound_account_ids,
    resolve_default_agent_bound_account_id,
    resolve_preferred_account_id,
)


class TestListBindings:
    """Test binding listing."""

    def test_list_bindings_empty_config(self):
        cfg = OpenClawConfig()
        assert list_bindings(cfg) == []

    def test_list_bindings_single_binding(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram"),
                )
            ]
        )
        assert len(list_bindings(cfg)) == 1

    def test_list_bindings_multiple_bindings(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram"),
                ),
                AgentBinding(
                    agent_id="helper",
                    match=AgentBindingMatch(channel="discord"),
                ),
            ]
        )
        assert len(list_bindings(cfg)) == 2


class TestListBoundAccountIds:
    """Test bound account ID listing."""

    def test_list_bound_account_ids_no_bindings(self):
        cfg = OpenClawConfig()
        assert list_bound_account_ids(cfg, "telegram") == []

    def test_list_bound_account_ids_single_account(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                )
            ]
        )
        assert list_bound_account_ids(cfg, "telegram") == ["bot1"]

    def test_list_bound_account_ids_multiple_accounts(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
                AgentBinding(
                    agent_id="helper",
                    match=AgentBindingMatch(channel="telegram", account_id="bot2"),
                ),
            ]
        )
        result = list_bound_account_ids(cfg, "telegram")
        assert sorted(result) == ["bot1", "bot2"]

    def test_list_bound_account_ids_wildcard_ignored(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="*"),
                ),
                AgentBinding(
                    agent_id="helper",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
            ]
        )
        # Wildcard should be ignored
        assert list_bound_account_ids(cfg, "telegram") == ["bot1"]

    def test_list_bound_account_ids_different_channel(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
                AgentBinding(
                    agent_id="helper",
                    match=AgentBindingMatch(channel="discord", account_id="bot2"),
                ),
            ]
        )
        # Should only return telegram accounts
        assert list_bound_account_ids(cfg, "telegram") == ["bot1"]


class TestResolveDefaultAgentBoundAccountId:
    """Test default agent bound account ID resolution."""

    def test_resolve_default_agent_bound_account_id_no_bindings(self):
        cfg = OpenClawConfig()
        assert resolve_default_agent_bound_account_id(cfg, "telegram") is None

    def test_resolve_default_agent_bound_account_id_default_agent(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                )
            ],
        )
        assert resolve_default_agent_bound_account_id(cfg, "telegram") == "bot1"

    def test_resolve_default_agent_bound_account_id_non_default_agent(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="helper"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="helper",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
            ],
        )
        # Should return None because helper is not the default agent
        assert resolve_default_agent_bound_account_id(cfg, "telegram") is None

    def test_resolve_default_agent_bound_account_id_wildcard_ignored(self):
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="*"),
                ),
            ],
        )
        # Wildcard should be ignored
        assert resolve_default_agent_bound_account_id(cfg, "telegram") is None


class TestBuildChannelAccountBindings:
    """Test channel account bindings map building."""

    def test_build_channel_account_bindings_empty(self):
        cfg = OpenClawConfig()
        assert build_channel_account_bindings(cfg) == {}

    def test_build_channel_account_bindings_single_binding(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                )
            ]
        )
        result = build_channel_account_bindings(cfg)
        assert result == {"telegram": {"main": ["bot1"]}}

    def test_build_channel_account_bindings_multiple_agents(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
                AgentBinding(
                    agent_id="helper",
                    match=AgentBindingMatch(channel="telegram", account_id="bot2"),
                ),
            ]
        )
        result = build_channel_account_bindings(cfg)
        assert result == {"telegram": {"main": ["bot1"], "helper": ["bot2"]}}

    def test_build_channel_account_bindings_multiple_channels(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="discord", account_id="bot2"),
                ),
            ]
        )
        result = build_channel_account_bindings(cfg)
        assert result == {
            "telegram": {"main": ["bot1"]},
            "discord": {"main": ["bot2"]},
        }

    def test_build_channel_account_bindings_multiple_accounts_same_agent(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="bot2"),
                ),
            ]
        )
        result = build_channel_account_bindings(cfg)
        assert result == {"telegram": {"main": ["bot1", "bot2"]}}

    def test_build_channel_account_bindings_wildcard_ignored(self):
        cfg = OpenClawConfig(
            bindings=[
                AgentBinding(
                    agent_id="main",
                    match=AgentBindingMatch(channel="telegram", account_id="*"),
                ),
            ]
        )
        # Wildcard should be ignored
        result = build_channel_account_bindings(cfg)
        assert result == {}


class TestResolvePreferredAccountId:
    """Test preferred account ID resolution."""

    def test_resolve_preferred_account_id_with_bound_accounts(self):
        result = resolve_preferred_account_id(
            account_ids=["bot1", "bot2"],
            default_account_id="default",
            bound_accounts=["bot1"],
        )
        assert result == "bot1"

    def test_resolve_preferred_account_id_no_bound_accounts(self):
        result = resolve_preferred_account_id(
            account_ids=["bot1", "bot2"],
            default_account_id="default",
            bound_accounts=[],
        )
        assert result == "default"

    def test_resolve_preferred_account_id_multiple_bound_accounts(self):
        # Should return first bound account
        result = resolve_preferred_account_id(
            account_ids=["bot1", "bot2", "bot3"],
            default_account_id="default",
            bound_accounts=["bot2", "bot3"],
        )
        assert result == "bot2"
