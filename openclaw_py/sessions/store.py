"""Session store persistence.

This module provides session storage with:
- JSON file-based persistence
- File locking for concurrent access
- Caching with TTL
- Automatic pruning of stale entries
- Entry count capping
- File rotation when size exceeds threshold
"""

import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any, Callable, TypeVar

import aiofiles
import aiofiles.os

from openclaw_py.logging import log_info, log_warn
from openclaw_py.utils import safe_parse_json

from .types import SessionEntry, merge_session_entry

# ============================================================================
# Session Store Cache with TTL Support
# ============================================================================

DEFAULT_SESSION_STORE_TTL_MS = 45_000  # 45 seconds


class _SessionStoreCacheEntry:
    """Cache entry for session store."""

    def __init__(self, store: dict[str, SessionEntry], store_path: str):
        self.store = store
        self.loaded_at = time.time()
        self.store_path = store_path
        self.mtime_ms: float | None = None


_SESSION_STORE_CACHE: dict[str, _SessionStoreCacheEntry] = {}


def _get_session_store_ttl_ms() -> int:
    """Get session store cache TTL from environment or default."""
    env_value = os.environ.get("OPENCLAW_SESSION_CACHE_TTL_MS", "")
    if env_value:
        try:
            return int(env_value)
        except ValueError:
            pass
    return DEFAULT_SESSION_STORE_TTL_MS


def _is_session_store_cache_enabled() -> bool:
    """Check if session store caching is enabled."""
    ttl = _get_session_store_ttl_ms()
    return ttl > 0


def _is_session_store_cache_valid(entry: _SessionStoreCacheEntry) -> bool:
    """Check if cache entry is still valid."""
    now = time.time()
    ttl_seconds = _get_session_store_ttl_ms() / 1000.0
    return (now - entry.loaded_at) <= ttl_seconds


def _invalidate_session_store_cache(store_path: str) -> None:
    """Invalidate cache for a specific store path."""
    _SESSION_STORE_CACHE.pop(store_path, None)


def clear_session_store_cache_for_test() -> None:
    """Clear all session store caches (for testing)."""
    _SESSION_STORE_CACHE.clear()


async def _get_file_mtime_ms(path: Path) -> float | None:
    """Get file modification time in milliseconds."""
    try:
        stat = await aiofiles.os.stat(path)
        return stat.st_mtime * 1000
    except FileNotFoundError:
        return None


# ============================================================================
# Session Store Loading
# ============================================================================


async def load_session_store(
    store_path: str | Path,
    skip_cache: bool = False,
) -> dict[str, SessionEntry]:
    """Load session store from JSON file.

    Args:
        store_path: Path to session store JSON file
        skip_cache: If True, bypass cache and load from disk

    Returns:
        Dictionary mapping session keys to SessionEntry objects

    Examples:
        >>> import tempfile
        >>> from pathlib import Path
        >>> store_path = Path(tempfile.mktemp(suffix=".json"))
        >>> store = await load_session_store(store_path)
        >>> len(store)
        0
    """
    store_path = Path(store_path)
    store_path_str = str(store_path)

    # Check cache first if enabled
    if not skip_cache and _is_session_store_cache_enabled():
        cached = _SESSION_STORE_CACHE.get(store_path_str)
        if cached and _is_session_store_cache_valid(cached):
            current_mtime = await _get_file_mtime_ms(store_path)
            if current_mtime == cached.mtime_ms:
                # Return a deep copy to prevent external mutations
                return {k: SessionEntry(**v.model_dump()) for k, v in cached.store.items()}
            _invalidate_session_store_cache(store_path_str)

    # Cache miss or disabled - load from disk
    store: dict[str, SessionEntry] = {}
    mtime_ms = await _get_file_mtime_ms(store_path)

    try:
        async with aiofiles.open(store_path, "r", encoding="utf-8") as f:
            content = await f.read()

        parsed = safe_parse_json(content)
        if isinstance(parsed, dict):
            # Convert dict entries to SessionEntry objects
            for key, value in parsed.items():
                if isinstance(value, dict):
                    try:
                        store[key] = SessionEntry(**value)
                    except Exception:
                        # Skip invalid entries
                        pass

        mtime_ms = await _get_file_mtime_ms(store_path) or mtime_ms
    except FileNotFoundError:
        # File doesn't exist yet - return empty store
        pass
    except Exception:
        # Ignore other errors (invalid JSON, etc.) - return empty store
        pass

    # Cache the result if caching is enabled
    if not skip_cache and _is_session_store_cache_enabled():
        cache_entry = _SessionStoreCacheEntry(store, store_path_str)
        cache_entry.mtime_ms = mtime_ms
        _SESSION_STORE_CACHE[store_path_str] = cache_entry

    # Return a deep copy
    return {k: SessionEntry(**v.model_dump()) for k, v in store.items()}


async def read_session_updated_at(
    store_path: str | Path,
    session_key: str,
) -> int | None:
    """Read the updated_at timestamp for a session.

    Args:
        store_path: Path to session store
        session_key: Session key to look up

    Returns:
        Timestamp in milliseconds or None if not found
    """
    try:
        store = await load_session_store(store_path)
        entry = store.get(session_key)
        return entry.updated_at if entry else None
    except Exception:
        return None


# ============================================================================
# Session Store Pruning, Capping & File Rotation
# ============================================================================

DEFAULT_SESSION_PRUNE_AFTER_MS = 30 * 24 * 60 * 60 * 1000  # 30 days
DEFAULT_SESSION_MAX_ENTRIES = 500
DEFAULT_SESSION_ROTATE_BYTES = 10 * 1024 * 1024  # 10 MB


def prune_stale_entries(
    store: dict[str, SessionEntry],
    max_age_ms: int | None = None,
    log: bool = True,
) -> int:
    """Remove entries older than max_age_ms.

    Mutates store in-place.

    Args:
        store: Session store dict
        max_age_ms: Max age in milliseconds (default: 30 days)
        log: Whether to log pruning

    Returns:
        Number of entries pruned
    """
    max_age = max_age_ms or DEFAULT_SESSION_PRUNE_AFTER_MS
    cutoff_ms = int(time.time() * 1000) - max_age
    pruned = 0

    keys_to_delete = []
    for key, entry in store.items():
        if entry.updated_at < cutoff_ms:
            keys_to_delete.append(key)
            pruned += 1

    for key in keys_to_delete:
        del store[key]

    if pruned > 0 and log:
        log_info(f"pruned {pruned} stale session entries", max_age_ms=max_age)

    return pruned


def cap_entry_count(
    store: dict[str, SessionEntry],
    max_entries: int | None = None,
    log: bool = True,
) -> int:
    """Cap store to N most recently updated entries.

    Mutates store in-place.

    Args:
        store: Session store dict
        max_entries: Maximum number of entries (default: 500)
        log: Whether to log capping

    Returns:
        Number of entries removed
    """
    max_count = max_entries or DEFAULT_SESSION_MAX_ENTRIES
    keys = list(store.keys())

    if len(keys) <= max_count:
        return 0

    # Sort by updated_at descending
    sorted_keys = sorted(
        keys,
        key=lambda k: store[k].updated_at,
        reverse=True,
    )

    # Remove oldest entries
    to_remove = sorted_keys[max_count:]
    for key in to_remove:
        del store[key]

    if log:
        log_info(f"capped session entry count", removed=len(to_remove), max_entries=max_count)

    return len(to_remove)


async def rotate_session_file(
    store_path: str | Path,
    max_bytes: int | None = None,
) -> bool:
    """Rotate session file if it exceeds size threshold.

    Renames current file to .bak.{timestamp} and keeps only 3 most recent backups.

    Args:
        store_path: Path to session store file
        max_bytes: Max file size in bytes (default: 10 MB)

    Returns:
        True if file was rotated
    """
    store_path = Path(store_path)
    max_size = max_bytes or DEFAULT_SESSION_ROTATE_BYTES

    try:
        stat = await aiofiles.os.stat(store_path)
        file_size = stat.st_size
    except FileNotFoundError:
        return False

    if file_size <= max_size:
        return False

    # Rotate: rename to .bak.{timestamp}
    timestamp_ms = int(time.time() * 1000)
    backup_path = Path(f"{store_path}.bak.{timestamp_ms}")

    try:
        await aiofiles.os.rename(store_path, backup_path)
        log_info(
            f"rotated session store file",
            backup_path=backup_path.name,
            size_bytes=file_size,
        )
    except Exception:
        return False

    # Clean up old backups - keep only 3 most recent
    try:
        dir_path = store_path.parent
        base_name = store_path.name
        files = await aiofiles.os.listdir(dir_path)

        backups = [
            f for f in files
            if f.startswith(f"{base_name}.bak.")
        ]
        backups.sort(reverse=True)

        max_backups = 3
        if len(backups) > max_backups:
            to_delete = backups[max_backups:]
            for old in to_delete:
                try:
                    await aiofiles.os.remove(dir_path / old)
                except Exception:
                    pass

            if to_delete:
                log_info(f"cleaned up old session store backups", deleted=len(to_delete))
    except Exception:
        # Best-effort cleanup
        pass

    return True


# ============================================================================
# File Locking
# ============================================================================

# Per-file locks (in-process)
_STORE_LOCKS: dict[str, asyncio.Lock] = {}


def _get_store_lock(store_path: str) -> asyncio.Lock:
    """Get or create a lock for a store path."""
    if store_path not in _STORE_LOCKS:
        _STORE_LOCKS[store_path] = asyncio.Lock()
    return _STORE_LOCKS[store_path]


# ============================================================================
# Session Store Saving
# ============================================================================


async def save_session_store(
    store_path: str | Path,
    store: dict[str, SessionEntry],
    skip_maintenance: bool = False,
) -> None:
    """Save session store to JSON file.

    Args:
        store_path: Path to session store file
        store: Session store dict
        skip_maintenance: If True, skip pruning/capping/rotation
    """
    store_path = Path(store_path)
    store_path_str = str(store_path)

    # Acquire lock
    lock = _get_store_lock(store_path_str)
    async with lock:
        # Invalidate cache on write
        _invalidate_session_store_cache(store_path_str)

        if not skip_maintenance:
            # Prune and cap before saving
            prune_stale_entries(store)
            cap_entry_count(store)

            # Rotate if needed
            await rotate_session_file(store_path)

        # Ensure parent directory exists
        store_path.parent.mkdir(parents=True, exist_ok=True)

        # Serialize to JSON
        json_data = {
            key: entry.model_dump(exclude_none=True)
            for key, entry in store.items()
        }
        json_str = json.dumps(json_data, indent=2, ensure_ascii=False)

        # Write atomically (temp file + rename on Unix, direct write on Windows)
        if os.name == "nt":
            # Windows: direct write
            async with aiofiles.open(store_path, "w", encoding="utf-8") as f:
                await f.write(json_str)
        else:
            # Unix: atomic rename
            import uuid
            tmp_path = store_path.parent / f"{store_path.name}.{os.getpid()}.{uuid.uuid4()}.tmp"
            try:
                async with aiofiles.open(tmp_path, "w", encoding="utf-8") as f:
                    await f.write(json_str)
                await aiofiles.os.rename(tmp_path, store_path)
                # Set permissions
                await aiofiles.os.chmod(store_path, 0o600)
            finally:
                # Clean up temp file if it still exists
                try:
                    await aiofiles.os.remove(tmp_path)
                except FileNotFoundError:
                    pass


T = TypeVar("T")


async def update_session_store(
    store_path: str | Path,
    mutator: Callable[[dict[str, SessionEntry]], T],
    skip_maintenance: bool = False,
) -> T:
    """Atomically update session store.

    Args:
        store_path: Path to session store file
        mutator: Function that mutates the store and returns a value
        skip_maintenance: If True, skip pruning/capping/rotation

    Returns:
        Value returned by mutator

    Examples:
        >>> async def add_session(store):
        ...     entry = SessionEntry(session_id="123", updated_at=1000)
        ...     store["key"] = entry
        ...     return entry
        >>> result = await update_session_store("/tmp/store.json", add_session)
    """
    store_path = Path(store_path)
    store_path_str = str(store_path)

    lock = _get_store_lock(store_path_str)
    async with lock:
        # Always re-read inside the lock to avoid clobbering concurrent writers
        store = await load_session_store(store_path, skip_cache=True)
        result = mutator(store)
        await save_session_store(store_path, store, skip_maintenance=skip_maintenance)
        return result
