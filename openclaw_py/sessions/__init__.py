"""OpenClaw sessions module.

This module provides session management and persistence functionality.
"""

from .key_utils import (
    ParsedAgentSessionKey,
    is_acp_session_key,
    is_cron_run_session_key,
    is_subagent_session_key,
    parse_agent_session_key,
    resolve_thread_parent_session_key,
)
from .label import (
    SESSION_LABEL_MAX_LENGTH,
    ParsedSessionLabel,
    parse_session_label,
)
from .memory_store import (
    AcpSession,
    InMemorySessionStore,
    default_acp_session_store,
)
from .store import (
    cap_entry_count,
    clear_session_store_cache_for_test,
    load_session_store,
    prune_stale_entries,
    read_session_updated_at,
    rotate_session_file,
    save_session_store,
    update_session_store,
)
from .types import (
    SessionEntry,
    SessionOrigin,
    merge_session_entry,
)

__all__ = [
    # Types
    "SessionEntry",
    "SessionOrigin",
    "merge_session_entry",
    # Key utilities
    "ParsedAgentSessionKey",
    "parse_agent_session_key",
    "is_cron_run_session_key",
    "is_subagent_session_key",
    "is_acp_session_key",
    "resolve_thread_parent_session_key",
    # Label validation
    "SESSION_LABEL_MAX_LENGTH",
    "ParsedSessionLabel",
    "parse_session_label",
    # Session store (persistence)
    "load_session_store",
    "save_session_store",
    "update_session_store",
    "read_session_updated_at",
    "prune_stale_entries",
    "cap_entry_count",
    "rotate_session_file",
    "clear_session_store_cache_for_test",
    # In-memory store (ACP/subagent)
    "AcpSession",
    "InMemorySessionStore",
    "default_acp_session_store",
]
