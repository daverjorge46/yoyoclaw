"""Telegram access control and permission checking.

This module handles allowFrom lists and sender permission validation.
"""

from openclaw_py.logging import log_debug
from openclaw_py.types import DmPolicy, GroupPolicy


def first_defined(*values):
    """Return the first defined (not None) value.

    Args:
        *values: Values to check

    Returns:
        First non-None value, or None if all are None

    Examples:
        >>> first_defined(None, "hello", "world")
        'hello'
        >>> first_defined(None, None, 42)
        42
    """
    for value in values:
        if value is not None:
            return value
    return None


def normalize_allow_from_entry(entry: str | int) -> str:
    """Normalize an allowFrom entry to lowercase string.

    Args:
        entry: AllowFrom entry (username string or user ID int)

    Returns:
        Normalized string

    Examples:
        >>> normalize_allow_from_entry("@JohnDoe")
        '@johndoe'
        >>> normalize_allow_from_entry("tg:JohnDoe")
        'tg:johndoe'
        >>> normalize_allow_from_entry(123456)
        '123456'
    """
    if isinstance(entry, int):
        return str(entry)
    return entry.strip().lower()


def normalize_allow_from_with_store(
    allow_from: list[str | int] | None,
    store_allow_from: list[str] | None,
) -> list[str]:
    """Merge and normalize allowFrom lists from config and pairing store.

    Args:
        allow_from: AllowFrom list from config
        store_allow_from: AllowFrom list from pairing store

    Returns:
        Merged and normalized allowFrom list

    Examples:
        >>> normalize_allow_from_with_store(["@alice", 123], ["@bob"])
        ['@alice', '123', '@bob']
    """
    result = []

    # Add config allowFrom
    if allow_from:
        result.extend(normalize_allow_from_entry(e) for e in allow_from)

    # Add store allowFrom
    if store_allow_from:
        result.extend(normalize_allow_from_entry(e) for e in store_allow_from)

    # Remove duplicates while preserving order
    seen = set()
    unique = []
    for item in result:
        if item not in seen:
            seen.add(item)
            unique.append(item)

    return unique


def is_sender_allowed(
    sender_id: int,
    sender_username: str | None,
    allow_from: list[str],
    dm_policy: DmPolicy | None = None,
    group_policy: GroupPolicy | None = None,
    is_group: bool = False,
    is_owner: bool = False,
) -> tuple[bool, str | None]:
    """Check if a sender is allowed to interact with the bot.

    Args:
        sender_id: Telegram user ID
        sender_username: Telegram username (without @)
        allow_from: Normalized allowFrom list
        dm_policy: DM policy ("open", "allowlist", "pairing", "disabled")
        group_policy: Group policy ("open", "allowlist", "disabled")
        is_group: Whether this is a group message
        is_owner: Whether sender is the bot owner

    Returns:
        Tuple of (is_allowed, allow_source)
        - is_allowed: Whether the sender is allowed
        - allow_source: Source of permission ("owner", "config", "pairing", "policy", None)

    Examples:
        >>> is_sender_allowed(123, "alice", ["@alice"], dm_policy="allowlist")
        (True, 'config')
        >>> is_sender_allowed(456, "bob", [], dm_policy="open", is_group=False)
        (True, 'policy')
    """
    # Owner always allowed
    if is_owner:
        log_debug(f"Sender {sender_id} (@{sender_username}) allowed: owner")
        return (True, "owner")

    # Check allowFrom list
    if allow_from:
        # Check by user ID
        if str(sender_id) in allow_from:
            log_debug(f"Sender {sender_id} allowed: config (user ID)")
            return (True, "config")

        # Check by username (with and without @ prefix)
        if sender_username:
            username_lower = sender_username.lower()
            at_username = f"@{username_lower}"
            tg_username = f"tg:{username_lower}"

            if username_lower in allow_from or at_username in allow_from or tg_username in allow_from:
                log_debug(f"Sender @{sender_username} allowed: config (username)")
                return (True, "config")

    # Apply policy-based access control
    if is_group:
        # Group policy
        if group_policy == "open":
            log_debug(f"Sender {sender_id} allowed: group policy (open)")
            return (True, "policy")
        elif group_policy == "disabled":
            log_debug(f"Sender {sender_id} denied: group policy (disabled)")
            return (False, None)
        elif group_policy == "allowlist":
            # Only allowed if in allowFrom list
            if allow_from:
                log_debug(f"Sender {sender_id} denied: not in group allowlist")
                return (False, None)
            else:
                # No allowlist configured, deny by default
                log_debug(f"Sender {sender_id} denied: group allowlist empty")
                return (False, None)
    else:
        # DM policy
        if dm_policy == "open":
            log_debug(f"Sender {sender_id} allowed: DM policy (open)")
            return (True, "policy")
        elif dm_policy == "disabled":
            log_debug(f"Sender {sender_id} denied: DM policy (disabled)")
            return (False, None)
        elif dm_policy == "pairing":
            # Pairing mode: check if in allowFrom (from pairing store)
            if allow_from:
                log_debug(f"Sender {sender_id} denied: not paired")
                return (False, None)
            else:
                # No pairing yet, deny
                log_debug(f"Sender {sender_id} denied: no pairing")
                return (False, None)
        elif dm_policy == "allowlist":
            # Only allowed if in allowFrom list
            if allow_from:
                log_debug(f"Sender {sender_id} denied: not in DM allowlist")
                return (False, None)
            else:
                # No allowlist configured, deny by default
                log_debug(f"Sender {sender_id} denied: DM allowlist empty")
                return (False, None)

    # Default: deny
    log_debug(f"Sender {sender_id} denied: default policy")
    return (False, None)
