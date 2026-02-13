"""Tests for agent route resolution."""

import pytest

from openclaw_py.config.types import (
    AgentBinding,
    AgentBindingMatch,
    AgentBindingMatchPeer,
    AgentConfig,
    AgentsConfig,
    OpenClawConfig,
    SessionConfig,
)
from openclaw_py.routing.resolve_route import (
    ResolveAgentRouteInput,
    RoutePeer,
    build_agent_session_key,
    resolve_agent_route,
)


class TestBuildAgentSessionKey:
    """Test agent session key building."""

    def test_build_agent_session_key_no_peer(self):
        result = build_agent_session_key(agent_id="main", channel="telegram")
        assert result == "agent:main:main"

    def test_build_agent_session_key_group_peer(self):
        peer = RoutePeer(kind="group", id="123456")
        result = build_agent_session_key(agent_id="main", channel="telegram", peer=peer)
        assert result == "agent:main:telegram:group:123456"

    def test_build_agent_session_key_channel_peer(self):
        peer = RoutePeer(kind="channel", id="789")
        result = build_agent_session_key(agent_id="main", channel="telegram", peer=peer)
        assert result == "agent:main:telegram:channel:789"

    def test_build_agent_session_key_direct_per_peer(self):
        peer = RoutePeer(kind="direct", id="user123")
        result = build_agent_session_key(
            agent_id="main", channel="telegram", peer=peer, dm_scope="per-peer"
        )
        assert result == "agent:main:direct:user123"

    def test_build_agent_session_key_direct_per_channel_peer(self):
        peer = RoutePeer(kind="direct", id="user123")
        result = build_agent_session_key(
            agent_id="main", channel="telegram", peer=peer, dm_scope="per-channel-peer"
        )
        assert result == "agent:main:telegram:direct:user123"

    def test_build_agent_session_key_direct_per_account_channel_peer(self):
        peer = RoutePeer(kind="direct", id="user123")
        result = build_agent_session_key(
            agent_id="main",
            channel="telegram",
            account_id="bot1",
            peer=peer,
            dm_scope="per-account-channel-peer",
        )
        assert result == "agent:main:telegram:bot1:direct:user123"


class TestResolveAgentRoute:
    """Test agent route resolution."""

    def test_resolve_agent_route_default(self):
        """Test default routing (no bindings)."""
        cfg = OpenClawConfig()
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram")
        route = resolve_agent_route(input_data)

        assert route.agent_id == "main"
        assert route.channel == "telegram"
        assert route.account_id == "default"
        assert route.session_key == "agent:main:main"
        assert route.main_session_key == "agent:main:main"
        assert route.matched_by == "default"

    def test_resolve_agent_route_channel_binding(self):
        """Test channel binding match (accountId='*')."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="telegram-bot"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="telegram-bot",
                    match=AgentBindingMatch(channel="telegram", account_id="*"),
                )
            ],
        )
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram")
        route = resolve_agent_route(input_data)

        assert route.agent_id == "telegram-bot"
        assert route.matched_by == "binding.channel"

    def test_resolve_agent_route_account_binding(self):
        """Test account-specific binding match."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="bot1-agent"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="bot1-agent",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                )
            ],
        )
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", account_id="bot1")
        route = resolve_agent_route(input_data)

        assert route.agent_id == "bot1-agent"
        assert route.account_id == "bot1"
        assert route.matched_by == "binding.account"

    def test_resolve_agent_route_peer_binding(self):
        """Test peer-specific binding match."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="vip-agent"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="vip-agent",
                    match=AgentBindingMatch(
                        channel="telegram",
                        peer=AgentBindingMatchPeer(kind="direct", id="vip_user"),
                    ),
                )
            ],
        )
        peer = RoutePeer(kind="direct", id="vip_user")
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", peer=peer)
        route = resolve_agent_route(input_data)

        assert route.agent_id == "vip-agent"
        assert route.matched_by == "binding.peer"

    def test_resolve_agent_route_parent_peer_binding(self):
        """Test parent peer binding match (thread inheritance)."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="group-agent"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="group-agent",
                    match=AgentBindingMatch(
                        channel="telegram",
                        peer=AgentBindingMatchPeer(kind="group", id="123456"),
                    ),
                )
            ],
        )
        # Thread message (peer doesn't match, but parent does)
        peer = RoutePeer(kind="group", id="999999")
        parent_peer = RoutePeer(kind="group", id="123456")
        input_data = ResolveAgentRouteInput(
            cfg=cfg, channel="telegram", peer=peer, parent_peer=parent_peer
        )
        route = resolve_agent_route(input_data)

        assert route.agent_id == "group-agent"
        assert route.matched_by == "binding.peer.parent"

    def test_resolve_agent_route_guild_binding(self):
        """Test guild binding match (Discord-specific)."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="discord-guild-agent"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="discord-guild-agent",
                    match=AgentBindingMatch(channel="discord", guild_id="guild123"),
                )
            ],
        )
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="discord", guild_id="guild123")
        route = resolve_agent_route(input_data)

        assert route.agent_id == "discord-guild-agent"
        assert route.matched_by == "binding.guild"

    def test_resolve_agent_route_team_binding(self):
        """Test team binding match (Slack-specific)."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="slack-team-agent"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="slack-team-agent",
                    match=AgentBindingMatch(channel="slack", team_id="team123"),
                )
            ],
        )
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="slack", team_id="team123")
        route = resolve_agent_route(input_data)

        assert route.agent_id == "slack-team-agent"
        assert route.matched_by == "binding.team"

    def test_resolve_agent_route_priority_peer_over_account(self):
        """Test that peer binding takes priority over account binding."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="peer-agent"),
                    AgentConfig(id="account-agent"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="account-agent",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
                AgentBinding(
                    agent_id="peer-agent",
                    match=AgentBindingMatch(
                        channel="telegram",
                        account_id="bot1",
                        peer=AgentBindingMatchPeer(kind="direct", id="user123"),
                    ),
                ),
            ],
        )
        peer = RoutePeer(kind="direct", id="user123")
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", account_id="bot1", peer=peer)
        route = resolve_agent_route(input_data)

        assert route.agent_id == "peer-agent"
        assert route.matched_by == "binding.peer"

    def test_resolve_agent_route_priority_account_over_channel(self):
        """Test that account binding takes priority over channel wildcard."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                    AgentConfig(id="account-agent"),
                    AgentConfig(id="channel-agent"),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="channel-agent",
                    match=AgentBindingMatch(channel="telegram", account_id="*"),
                ),
                AgentBinding(
                    agent_id="account-agent",
                    match=AgentBindingMatch(channel="telegram", account_id="bot1"),
                ),
            ],
        )
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", account_id="bot1")
        route = resolve_agent_route(input_data)

        assert route.agent_id == "account-agent"
        assert route.matched_by == "binding.account"

    def test_resolve_agent_route_dm_scope_main(self):
        """Test DM scope 'main' (falls back to main session)."""
        cfg = OpenClawConfig(session=SessionConfig(dm_scope="main"))
        peer = RoutePeer(kind="direct", id="user123")
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", peer=peer)
        route = resolve_agent_route(input_data)

        assert route.session_key == "agent:main:main"

    def test_resolve_agent_route_dm_scope_per_peer(self):
        """Test DM scope 'per-peer'."""
        cfg = OpenClawConfig(session=SessionConfig(dm_scope="per-peer"))
        peer = RoutePeer(kind="direct", id="user123")
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", peer=peer)
        route = resolve_agent_route(input_data)

        assert route.session_key == "agent:main:direct:user123"

    def test_resolve_agent_route_dm_scope_per_channel_peer(self):
        """Test DM scope 'per-channel-peer'."""
        cfg = OpenClawConfig(session=SessionConfig(dm_scope="per-channel-peer"))
        peer = RoutePeer(kind="direct", id="user123")
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", peer=peer)
        route = resolve_agent_route(input_data)

        assert route.session_key == "agent:main:telegram:direct:user123"

    def test_resolve_agent_route_dm_scope_per_account_channel_peer(self):
        """Test DM scope 'per-account-channel-peer'."""
        cfg = OpenClawConfig(session=SessionConfig(dm_scope="per-account-channel-peer"))
        peer = RoutePeer(kind="direct", id="user123")
        input_data = ResolveAgentRouteInput(
            cfg=cfg, channel="telegram", account_id="bot1", peer=peer
        )
        route = resolve_agent_route(input_data)

        assert route.session_key == "agent:main:telegram:bot1:direct:user123"

    def test_resolve_agent_route_identity_links(self):
        """Test identity linking."""
        cfg = OpenClawConfig(
            session=SessionConfig(
                dm_scope="per-peer",
                identity_links={
                    "alice": ["telegram:user123", "discord:alice#1234"],
                },
            )
        )
        peer = RoutePeer(kind="direct", id="user123")
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram", peer=peer)
        route = resolve_agent_route(input_data)

        # Should resolve to canonical ID "alice"
        assert route.session_key == "agent:main:direct:alice"

    def test_resolve_agent_route_nonexistent_agent_fallback(self):
        """Test fallback when bound agent doesn't exist."""
        cfg = OpenClawConfig(
            agents=AgentsConfig(
                list=[
                    AgentConfig(id="main", default=True),
                ]
            ),
            bindings=[
                AgentBinding(
                    agent_id="nonexistent",
                    match=AgentBindingMatch(channel="telegram"),
                )
            ],
        )
        input_data = ResolveAgentRouteInput(cfg=cfg, channel="telegram")
        route = resolve_agent_route(input_data)

        # Should fall back to default agent "main"
        assert route.agent_id == "main"
