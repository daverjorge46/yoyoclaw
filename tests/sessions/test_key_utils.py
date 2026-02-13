"""Tests for session key utilities."""

import pytest

from openclaw_py.sessions import (
    is_acp_session_key,
    is_cron_run_session_key,
    is_subagent_session_key,
    parse_agent_session_key,
    resolve_thread_parent_session_key,
)


class TestParseAgentSessionKey:
    """Tests for parse_agent_session_key function."""

    def test_parse_valid_key(self):
        """Test parsing valid agent session key."""
        result = parse_agent_session_key("agent:main:subagent:task")
        assert result is not None
        assert result.agent_id == "main"
        assert result.rest == "subagent:task"

    def test_parse_complex_rest(self):
        """Test parsing key with complex rest part."""
        result = parse_agent_session_key("agent:bot123:acp:session:thread:456")
        assert result is not None
        assert result.agent_id == "bot123"
        assert result.rest == "acp:session:thread:456"

    def test_parse_invalid_prefix(self):
        """Test parsing key with invalid prefix."""
        result = parse_agent_session_key("invalid:main:rest")
        assert result is None

    def test_parse_too_few_parts(self):
        """Test parsing key with too few parts."""
        assert parse_agent_session_key("agent:main") is None
        assert parse_agent_session_key("agent") is None

    def test_parse_empty_string(self):
        """Test parsing empty string."""
        assert parse_agent_session_key("") is None
        assert parse_agent_session_key("   ") is None

    def test_parse_none(self):
        """Test parsing None."""
        assert parse_agent_session_key(None) is None

    def test_parse_empty_parts(self):
        """Test parsing key with empty parts."""
        # Empty agent_id
        assert parse_agent_session_key("agent::rest") is None
        # Empty rest
        assert parse_agent_session_key("agent:main:") is None


class TestIsCronRunSessionKey:
    """Tests for is_cron_run_session_key function."""

    def test_valid_cron_run_key(self):
        """Test valid cron run session key."""
        assert is_cron_run_session_key("agent:main:cron:daily:run:123")
        assert is_cron_run_session_key("agent:bot:cron:hourly:run:abc")

    def test_invalid_cron_pattern(self):
        """Test invalid cron patterns."""
        assert not is_cron_run_session_key("agent:main:cron:daily")
        assert not is_cron_run_session_key("agent:main:cron:daily:run")
        assert not is_cron_run_session_key("agent:main:cron:daily:execute:123")

    def test_non_cron_key(self):
        """Test non-cron session keys."""
        assert not is_cron_run_session_key("agent:main:subagent:task")
        assert not is_cron_run_session_key("agent:main:acp:session")

    def test_cron_key_invalid_format(self):
        """Test cron key with invalid format."""
        assert not is_cron_run_session_key("cron:daily:run:123")  # Missing agent prefix
        assert not is_cron_run_session_key(None)
        assert not is_cron_run_session_key("")


class TestIsSubagentSessionKey:
    """Tests for is_subagent_session_key function."""

    def test_direct_subagent_prefix(self):
        """Test keys starting with subagent:."""
        assert is_subagent_session_key("subagent:task")
        assert is_subagent_session_key("Subagent:task")  # Case insensitive
        assert is_subagent_session_key("SUBAGENT:task")

    def test_agent_prefixed_subagent(self):
        """Test agent:id:subagent: format."""
        assert is_subagent_session_key("agent:main:subagent:task")
        assert is_subagent_session_key("agent:bot:SUBAGENT:work")

    def test_non_subagent_key(self):
        """Test non-subagent keys."""
        assert not is_subagent_session_key("agent:main:acp:session")
        assert not is_subagent_session_key("agent:main:cron:daily:run:123")
        assert not is_subagent_session_key("normal:session:key")

    def test_empty_and_none(self):
        """Test empty and None values."""
        assert not is_subagent_session_key(None)
        assert not is_subagent_session_key("")
        assert not is_subagent_session_key("   ")


class TestIsAcpSessionKey:
    """Tests for is_acp_session_key function."""

    def test_direct_acp_prefix(self):
        """Test keys starting with acp:."""
        assert is_acp_session_key("acp:session")
        assert is_acp_session_key("ACP:session")  # Case insensitive
        assert is_acp_session_key("Acp:test")

    def test_agent_prefixed_acp(self):
        """Test agent:id:acp: format."""
        assert is_acp_session_key("agent:main:acp:session")
        assert is_acp_session_key("agent:bot:ACP:work")

    def test_non_acp_key(self):
        """Test non-ACP keys."""
        assert not is_acp_session_key("agent:main:subagent:task")
        assert not is_acp_session_key("agent:main:cron:daily:run:123")
        assert not is_acp_session_key("normal:session:key")

    def test_empty_and_none(self):
        """Test empty and None values."""
        assert not is_acp_session_key(None)
        assert not is_acp_session_key("")
        assert not is_acp_session_key("   ")


class TestResolveThreadParentSessionKey:
    """Tests for resolve_thread_parent_session_key function."""

    def test_thread_marker(self):
        """Test resolving parent with :thread: marker."""
        result = resolve_thread_parent_session_key("agent:main:session:thread:123")
        assert result == "agent:main:session"

    def test_topic_marker(self):
        """Test resolving parent with :topic: marker."""
        result = resolve_thread_parent_session_key("chat:conversation:topic:456")
        assert result == "chat:conversation"

    def test_multiple_markers(self):
        """Test resolving with multiple markers (uses last one)."""
        result = resolve_thread_parent_session_key("base:thread:child:topic:grandchild")
        assert result == "base:thread:child"  # After last :topic:

    def test_case_insensitive(self):
        """Test case-insensitive marker matching."""
        result = resolve_thread_parent_session_key("session:THREAD:123")
        assert result == "session"

        result2 = resolve_thread_parent_session_key("session:Topic:456")
        assert result2 == "session"

    def test_no_marker(self):
        """Test key without thread markers."""
        result = resolve_thread_parent_session_key("simple:session:key")
        assert result is None

    def test_marker_at_start(self):
        """Test marker at start (invalid - needs parent before marker)."""
        result = resolve_thread_parent_session_key(":thread:123")
        assert result is None

    def test_empty_parent(self):
        """Test empty parent before marker."""
        result = resolve_thread_parent_session_key("thread:123")
        # "thread" is not a valid marker position, so no match
        assert result is None

    def test_empty_and_none(self):
        """Test empty and None values."""
        assert resolve_thread_parent_session_key(None) is None
        assert resolve_thread_parent_session_key("") is None
        assert resolve_thread_parent_session_key("   ") is None

    def test_whitespace_handling(self):
        """Test whitespace is trimmed from parent."""
        result = resolve_thread_parent_session_key("  session:key  :thread:123")
        # The input is trimmed, so this should work
        assert result is not None
