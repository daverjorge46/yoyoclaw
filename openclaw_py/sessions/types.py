"""Session types and models.

This module defines the data structures for session management.
"""

import uuid
from typing import Any

from pydantic import BaseModel, Field

from openclaw_py.types import ChatType


class SessionOrigin(BaseModel):
    """Session origin information."""

    label: str | None = None
    provider: str | None = None
    surface: str | None = None
    chat_type: ChatType | None = None
    from_: str | None = Field(None, alias="from")
    to: str | None = None
    account_id: str | None = None
    thread_id: str | int | None = None

    class Config:
        populate_by_name = True


class SessionEntry(BaseModel):
    """Session entry stored in the session store.

    This is a simplified version focusing on core session management.
    Additional fields for agent execution will be added in later batches.
    """

    # Core identity
    session_id: str
    updated_at: int  # Timestamp in milliseconds

    # Session metadata
    session_file: str | None = None
    spawned_by: str | None = None
    label: str | None = None
    display_name: str | None = None

    # Chat context
    chat_type: ChatType | None = None
    channel: str | None = None
    group_id: str | None = None
    subject: str | None = None
    group_channel: str | None = None
    space: str | None = None

    # Origin tracking
    origin: SessionOrigin | None = None

    # Last delivery route (simplified - full DeliveryContext in batch 13)
    last_channel: str | None = None
    last_to: str | None = None
    last_account_id: str | None = None
    last_thread_id: str | int | None = None

    # Agent execution state
    aborted_last_run: bool = False
    system_sent: bool = False

    # Model and provider tracking
    model_provider: str | None = None
    model: str | None = None
    context_tokens: int | None = None

    # Usage tracking
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    compaction_count: int = 0

    # Overrides
    provider_override: str | None = None
    model_override: str | None = None
    auth_profile_override: str | None = None

    # Policy
    send_policy: str | None = None  # "allow" or "deny"
    group_activation: str | None = None  # "mention" or "always"

    # Extended metadata (stored as dict for flexibility)
    extra: dict[str, Any] | None = None

    class Config:
        populate_by_name = True


def merge_session_entry(
    existing: SessionEntry | None,
    patch: dict[str, Any],
) -> SessionEntry:
    """Merge a partial update into an existing session entry.

    Args:
        existing: Existing session entry (or None for new session)
        patch: Partial update dict

    Returns:
        Merged session entry

    Examples:
        >>> entry = SessionEntry(session_id="123", updated_at=1000)
        >>> merged = merge_session_entry(entry, {"label": "test"})
        >>> merged.label
        'test'
        >>> merged.session_id
        '123'
    """
    import time

    # Determine session_id
    session_id = patch.get("session_id") or (existing.session_id if existing else str(uuid.uuid4()))

    # Determine updated_at (max of existing, patch, or current time)
    now_ms = int(time.time() * 1000)
    updated_at = max(
        existing.updated_at if existing else 0,
        patch.get("updated_at", 0),
        now_ms,
    )

    if not existing:
        # Create new entry from patch
        return SessionEntry(
            session_id=session_id,
            updated_at=updated_at,
            **{k: v for k, v in patch.items() if k not in ("session_id", "updated_at")},
        )

    # Merge existing with patch
    merged_data = existing.model_dump()
    merged_data.update(patch)
    merged_data["session_id"] = session_id
    merged_data["updated_at"] = updated_at

    return SessionEntry(**merged_data)
