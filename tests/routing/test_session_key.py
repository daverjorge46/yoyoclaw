"""Tests for session key building and normalization."""

import pytest

from openclaw_py.routing.session_key import (
    DEFAULT_ACCOUNT_ID,
    DEFAULT_AGENT_ID,
    DEFAULT_MAIN_KEY,
    build_agent_main_session_key,
    build_agent_peer_session_key,
    build_group_history_key,
    classify_session_key_shape,
    normalize_account_id,
    normalize_agent_id,
    normalize_main_key,
    resolve_agent_id_from_session_key,
    resolve_thread_session_keys,
    sanitize_agent_id,
    to_agent_request_session_key,
    to_agent_store_session_key,
)


class TestNormalization:
    """Test normalization functions."""

    def test_normalize_main_key(self):
        assert normalize_main_key("Main") == "main"
        assert normalize_main_key("  Custom  ") == "custom"
        assert normalize_main_key("") == DEFAULT_MAIN_KEY
        assert normalize_main_key(None) == DEFAULT_MAIN_KEY

    def test_normalize_agent_id(self):
        assert normalize_agent_id("MyAgent") == "myagent"
        assert normalize_agent_id("agent-1") == "agent-1"
        assert normalize_agent_id("agent_2") == "agent_2"
        assert normalize_agent_id("") == DEFAULT_AGENT_ID
        assert normalize_agent_id(None) == DEFAULT_AGENT_ID

    def test_normalize_agent_id_invalid_chars(self):
        # Invalid characters should be collapsed to dashes
        assert normalize_agent_id("agent@#$123") == "agent-123"
        assert normalize_agent_id("my agent") == "my-agent"
        assert normalize_agent_id("-leading") == "leading"
        assert normalize_agent_id("trailing-") == "trailing"

    def test_normalize_agent_id_max_length(self):
        long_id = "a" * 100
        result = normalize_agent_id(long_id)
        assert len(result) == 64

    def test_sanitize_agent_id(self):
        # sanitize_agent_id is an alias for normalize_agent_id
        assert sanitize_agent_id("MyAgent") == "myagent"
        assert sanitize_agent_id("") == DEFAULT_AGENT_ID

    def test_normalize_account_id(self):
        assert normalize_account_id("Account-1") == "account-1"
        assert normalize_account_id("bot_1") == "bot_1"
        assert normalize_account_id("") == DEFAULT_ACCOUNT_ID
        assert normalize_account_id(None) == DEFAULT_ACCOUNT_ID


class TestSessionKeyConversion:
    """Test session key conversion functions."""

    def test_to_agent_request_session_key(self):
        assert to_agent_request_session_key("agent:main:subagent:task") == "subagent:task"
        assert to_agent_request_session_key("agent:main:main") == "main"
        assert to_agent_request_session_key("custom_key") == "custom_key"
        assert to_agent_request_session_key("") is None
        assert to_agent_request_session_key(None) is None

    def test_to_agent_store_session_key(self):
        assert to_agent_store_session_key("main", "subagent:task") == "agent:main:subagent:task"
        assert to_agent_store_session_key("main", "main") == "agent:main:main"
        assert to_agent_store_session_key("main", "") == "agent:main:main"
        assert to_agent_store_session_key("main", None) == "agent:main:main"

    def test_to_agent_store_session_key_already_agent(self):
        # Already an agent key -> return lowercased
        assert to_agent_store_session_key("main", "agent:custom:main") == "agent:custom:main"

    def test_to_agent_store_session_key_subagent(self):
        # Subagent key -> prepend agent prefix
        assert to_agent_store_session_key("main", "subagent:task") == "agent:main:subagent:task"


class TestSessionKeyClassification:
    """Test session key classification."""

    def test_classify_session_key_shape(self):
        assert classify_session_key_shape("agent:main:main") == "agent"
        assert classify_session_key_shape("agent:custom:subagent:task") == "agent"
        assert classify_session_key_shape("agent:invalid") == "malformed_agent"
        assert classify_session_key_shape("custom") == "legacy_or_alias"
        assert classify_session_key_shape("") == "missing"
        assert classify_session_key_shape(None) == "missing"


class TestResolveAgentId:
    """Test agent ID resolution from session key."""

    def test_resolve_agent_id_from_session_key(self):
        assert resolve_agent_id_from_session_key("agent:custom:main") == "custom"
        assert resolve_agent_id_from_session_key("agent:helper:subagent:task") == "helper"
        assert resolve_agent_id_from_session_key("unknown") == DEFAULT_AGENT_ID
        assert resolve_agent_id_from_session_key("") == DEFAULT_AGENT_ID
        assert resolve_agent_id_from_session_key(None) == DEFAULT_AGENT_ID


class TestBuildSessionKeys:
    """Test session key building."""

    def test_build_agent_main_session_key(self):
        assert build_agent_main_session_key("main") == "agent:main:main"
        assert build_agent_main_session_key("custom") == "agent:custom:main"
        assert build_agent_main_session_key("main", "special") == "agent:main:special"

    def test_build_agent_peer_session_key_direct_main_scope(self):
        # DM with main scope -> falls back to main session key
        result = build_agent_peer_session_key(
            agent_id="main",
            main_key=None,
            channel="telegram",
            peer_kind="direct",
            peer_id="user123",
            dm_scope="main",
        )
        assert result == "agent:main:main"

    def test_build_agent_peer_session_key_direct_per_peer(self):
        result = build_agent_peer_session_key(
            agent_id="main",
            main_key=None,
            channel="telegram",
            peer_kind="direct",
            peer_id="user123",
            dm_scope="per-peer",
        )
        assert result == "agent:main:direct:user123"

    def test_build_agent_peer_session_key_direct_per_channel_peer(self):
        result = build_agent_peer_session_key(
            agent_id="main",
            main_key=None,
            channel="telegram",
            peer_kind="direct",
            peer_id="user123",
            dm_scope="per-channel-peer",
        )
        assert result == "agent:main:telegram:direct:user123"

    def test_build_agent_peer_session_key_direct_per_account_channel_peer(self):
        result = build_agent_peer_session_key(
            agent_id="main",
            main_key=None,
            channel="telegram",
            account_id="bot1",
            peer_kind="direct",
            peer_id="user123",
            dm_scope="per-account-channel-peer",
        )
        assert result == "agent:main:telegram:bot1:direct:user123"

    def test_build_agent_peer_session_key_group(self):
        result = build_agent_peer_session_key(
            agent_id="main",
            main_key=None,
            channel="telegram",
            peer_kind="group",
            peer_id="group456",
        )
        assert result == "agent:main:telegram:group:group456"

    def test_build_agent_peer_session_key_channel(self):
        result = build_agent_peer_session_key(
            agent_id="main",
            main_key=None,
            channel="telegram",
            peer_kind="channel",
            peer_id="channel789",
        )
        assert result == "agent:main:telegram:channel:channel789"

    def test_build_agent_peer_session_key_identity_linking(self):
        identity_links = {
            "alice": ["telegram:user123", "discord:alice#1234"],
        }
        result = build_agent_peer_session_key(
            agent_id="main",
            main_key=None,
            channel="telegram",
            peer_kind="direct",
            peer_id="user123",
            dm_scope="per-peer",
            identity_links=identity_links,
        )
        # Should resolve to canonical ID "alice"
        assert result == "agent:main:direct:alice"


class TestBuildGroupHistoryKey:
    """Test group history key building."""

    def test_build_group_history_key(self):
        result = build_group_history_key(
            channel="telegram",
            account_id="bot1",
            peer_kind="group",
            peer_id="123456",
        )
        assert result == "telegram:bot1:group:123456"

    def test_build_group_history_key_channel_peer(self):
        result = build_group_history_key(
            channel="telegram",
            account_id="bot1",
            peer_kind="channel",
            peer_id="789",
        )
        assert result == "telegram:bot1:channel:789"


class TestThreadSessionKeys:
    """Test thread session key resolution."""

    def test_resolve_thread_session_keys_with_thread(self):
        result = resolve_thread_session_keys(
            base_session_key="agent:main:main",
            thread_id="123",
        )
        assert result["session_key"] == "agent:main:main:thread:123"
        assert result["parent_session_key"] is None

    def test_resolve_thread_session_keys_with_parent(self):
        result = resolve_thread_session_keys(
            base_session_key="agent:main:telegram:group:456",
            thread_id="123",
            parent_session_key="agent:main:telegram:group:456",
        )
        assert result["session_key"] == "agent:main:telegram:group:456:thread:123"
        assert result["parent_session_key"] == "agent:main:telegram:group:456"

    def test_resolve_thread_session_keys_no_thread(self):
        result = resolve_thread_session_keys(
            base_session_key="agent:main:main",
            thread_id=None,
        )
        assert result["session_key"] == "agent:main:main"
        assert result["parent_session_key"] is None

    def test_resolve_thread_session_keys_use_suffix_false(self):
        result = resolve_thread_session_keys(
            base_session_key="agent:main:main",
            thread_id="123",
            use_suffix=False,
        )
        assert result["session_key"] == "agent:main:main"
        assert result["parent_session_key"] is None
