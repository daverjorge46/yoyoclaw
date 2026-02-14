#!/usr/bin/env python3
"""
OpenClaw Session → Telegram Forum Sync

Watches all .jsonl session files for updates and forwards meaningful entries
to a Telegram forum group, creating one topic per session with a descriptive name.

Usage:
  python3 scripts/session-tg-sync.py [OPTIONS]

Options:
  --dir DIR          Session directory (default: data/.openclaw/agents/main/sessions)
  --interval S       Poll interval in seconds (default: 2.0)
  --config PATH      openclaw.json path (auto-detected)
  --chat-id ID       Telegram group chat ID (default: -1003837358001)
  --dry-run          Print messages instead of sending to Telegram
  --batch-delay S    Delay between batched messages to avoid rate limits (default: 0.3)
  --filter TYPE      Filter: all, message, tool, important (default: important)
  --state PATH       State file to persist topic mappings across restarts
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# ── Telegram API ─────────────────────────────────────────────────────────────

class TelegramAPI:
    """Minimal Telegram Bot API client using urllib (no deps)."""

    def __init__(self, bot_token: str, chat_id: int, dry_run: bool = False):
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
        self.chat_id = chat_id
        self.dry_run = dry_run

    def _call(self, method: str, params: dict) -> dict | None:
        if self.dry_run:
            print(f"  [DRY-RUN] {method}: {json.dumps(params, ensure_ascii=False)[:200]}")
            return {"ok": True, "result": {"message_thread_id": 999}}
        url = f"{self.base_url}/{method}"
        data = json.dumps(params).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            print(f"  [TG ERROR] {method} {e.code}: {body[:200]}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"  [TG ERROR] {method}: {e}", file=sys.stderr)
            return None

    def create_forum_topic(self, name: str, icon_color: int | None = None) -> int | None:
        """Create a forum topic, return message_thread_id or None."""
        params: dict = {"chat_id": self.chat_id, "name": name[:128]}
        if icon_color is not None:
            params["icon_color"] = icon_color
        result = self._call("createForumTopic", params)
        if result and result.get("ok"):
            return result["result"].get("message_thread_id")
        return None

    def send_message(self, text: str, thread_id: int, parse_mode: str = "HTML") -> bool:
        """Send a message to a specific forum topic."""
        params = {
            "chat_id": self.chat_id,
            "message_thread_id": thread_id,
            "text": text[:4096],
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }
        result = self._call("sendMessage", params)
        return result is not None and result.get("ok", False)


# ── Helpers ──────────────────────────────────────────────────────────────────

def short_id(session_id: str) -> str:
    return session_id[:8] if len(session_id) > 8 else session_id


def fmt_time(ts_str: str) -> str:
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        local = dt.astimezone()
        return local.strftime("%H:%M:%S")
    except Exception:
        return ts_str[:8] if ts_str else "??:??:??"


def truncate(text: str, max_len: int = 200) -> str:
    text = text.replace("\n", " ").strip()
    if len(text) > max_len:
        return text[: max_len - 1] + "…"
    return text


def html_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ── Session metadata ─────────────────────────────────────────────────────────

def load_sessions_index(session_dir: str) -> dict:
    """Load sessions.json to get labels and metadata."""
    path = Path(session_dir) / "sessions.json"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def derive_topic_name(session_id: str, session_dir: str, sessions_index: dict) -> str:
    """
    Derive a meaningful topic name for a session.
    Priority: label from sessions.json > session key pattern > short ID.
    """
    # search sessions_index for matching sessionId
    for key, meta in sessions_index.items():
        if meta.get("sessionId", "").startswith(session_id[:8]):
            label = meta.get("label", "")
            if label:
                # Clean up label for topic name
                # "Cron: self:bg-task-orchestrator" → "bg-task-orchestrator"
                # "Cron: daily:morning-todo-brief" → "morning-todo-brief"
                clean = label
                if clean.startswith("Cron: "):
                    clean = clean[6:]
                if ":" in clean:
                    clean = clean.split(":", 1)[1]
                return f"🤖 {clean}"

            # derive from key pattern
            if key == "agent:main:main":
                return "🏠 main"
            if "telegram" in key:
                subject = meta.get("subject", "")
                if subject:
                    return f"💬 {subject}"
                return f"💬 telegram"
            if "subagent" in key:
                sub_label = meta.get("label", "")
                if sub_label:
                    return f"🔀 {sub_label}"
                sub_id = key.split(":")[-1][:12]
                return f"🔀 sub:{sub_id}"
            if "cron" in key:
                return f"⏰ cron:{short_id(session_id)}"
            if "test" in key:
                return f"🧪 test"

            return f"📋 {short_id(session_id)}"

    # fallback: try to read the first few lines of the jsonl for clues
    jsonl_path = Path(session_dir) / f"{session_id}.jsonl"
    if jsonl_path.exists():
        try:
            with open(jsonl_path, "r", encoding="utf-8", errors="replace") as f:
                for i, line in enumerate(f):
                    if i > 15:
                        break
                    try:
                        entry = json.loads(line.strip())
                        # check first user message for context
                        if entry.get("type") == "message":
                            msg = entry.get("message", {})
                            if msg.get("role") == "user":
                                content = msg.get("content", "")
                                if isinstance(content, list):
                                    for part in content:
                                        if part.get("type") == "text":
                                            content = part["text"]
                                            break
                                if isinstance(content, str):
                                    # extract task hint from first user message
                                    text = content.strip()
                                    # look for [label] pattern
                                    if text.startswith("[") and "]" in text:
                                        bracket = text[1:text.index("]")]
                                        # e.g. [cron:xxx self:bg-task-orchestrator]
                                        parts = bracket.split()
                                        name = parts[-1] if parts else bracket
                                        if ":" in name:
                                            name = name.split(":", 1)[1]
                                        return f"🤖 {name[:40]}"
                                    # use first 30 chars of message
                                    preview = truncate(text, 30)
                                    return f"📋 {preview}"
                    except json.JSONDecodeError:
                        pass
        except (OSError, IOError):
            pass

    return f"📋 {short_id(session_id)}"


# ── Topic icon colors (Telegram supports 6 fixed colors) ────────────────────
# 7322096 (blue), 16766590 (yellow), 13338331 (purple),
# 9367192 (green), 16749490 (red), 16478047 (orange)

TOPIC_COLORS = {
    "main": 7322096,      # blue
    "cron": 9367192,       # green
    "subagent": 16766590,  # yellow
    "telegram": 13338331,  # purple
    "test": 16749490,      # red
    "other": 16478047,     # orange
}


def session_category(session_id: str, sessions_index: dict) -> str:
    for key, meta in sessions_index.items():
        if meta.get("sessionId", "").startswith(session_id[:8]):
            if key == "agent:main:main":
                return "main"
            if "subagent" in key:
                return "subagent"
            if "cron" in key:
                return "cron"
            if "telegram" in key:
                return "telegram"
            if "test" in key:
                return "test"
    return "other"


# ── Entry → TG message formatting ───────────────────────────────────────────

def format_tool_summary(name: str, args: dict) -> str:
    if name == "read":
        path = args.get("file_path", args.get("path", "?"))
        return f"📖 read → <code>{html_escape(os.path.basename(path))}</code>"
    if name == "write":
        path = args.get("file_path", args.get("path", "?"))
        return f"✏️ write → <code>{html_escape(os.path.basename(path))}</code>"
    if name == "edit":
        path = args.get("file_path", args.get("path", "?"))
        return f"✏️ edit → <code>{html_escape(os.path.basename(path))}</code>"
    if name == "exec":
        cmd = args.get("command", "?")
        return f"⚡ exec → <code>{html_escape(truncate(cmd, 80))}</code>"
    if name == "process":
        cmd = args.get("command", args.get("action", "?"))
        return f"⚡ process → <code>{html_escape(truncate(str(cmd), 80))}</code>"
    if name == "sessions_spawn":
        label = args.get("label", "?")
        return f"🔀 spawn → <b>{html_escape(label)}</b>"
    if name == "sessions_list":
        return "📋 sessions_list"
    if name == "sessions_history":
        key = args.get("sessionKey", "?")
        return f"📋 sessions_history → {html_escape(short_id(key))}"
    arg_preview = ", ".join(f"{k}={truncate(str(v), 20)}" for k, v in list(args.items())[:2])
    return f"🔧 {html_escape(name)}({html_escape(arg_preview)})"


def entry_to_tg_message(entry: dict, filter_mode: str) -> str | None:
    """
    Convert a JSONL entry to a Telegram HTML message.
    Returns None if the entry should be skipped based on filter_mode.
    """
    etype = entry.get("type", "?")
    ts = fmt_time(entry.get("timestamp", ""))
    prefix = f"<code>{ts}</code>"

    if etype == "session":
        if filter_mode == "important":
            return None  # skip session start noise
        return f"{prefix} 📋 Session started"

    if etype == "model_change":
        if filter_mode == "important":
            return None
        provider = entry.get("provider", "?")
        model = entry.get("modelId", "?")
        return f"{prefix} ⚙️ Model → {html_escape(provider)}/{html_escape(model)}"

    if etype == "thinking_level_change":
        return None  # always skip, low value

    if etype == "custom":
        return None  # skip model-snapshot etc

    if etype == "message":
        msg = entry.get("message", {})
        role = msg.get("role", "?")
        content = msg.get("content", "")

        if isinstance(content, str):
            if filter_mode == "important" and role not in ("user", "assistant"):
                return None
            icon = "👤" if role == "user" else "💬"
            return f"{prefix} {icon} {html_escape(truncate(content, 300))}"

        if isinstance(content, list):
            # toolResult — skip in important mode (too noisy)
            if role == "toolResult":
                if filter_mode in ("important", "message"):
                    return None
                for part in content:
                    if part.get("type") == "text":
                        text = part.get("text", "")
                        return f"{prefix} ↩️ <i>{html_escape(truncate(text, 150))}</i>"
                return None

            parts = []
            has_meaningful = False

            for part in content:
                ptype = part.get("type", "?")

                if ptype == "text":
                    text = part.get("text", "")
                    if not text.strip():
                        continue
                    has_meaningful = True
                    if role == "user":
                        parts.append(f"👤 {html_escape(truncate(text, 300))}")
                    else:
                        parts.append(f"💬 {html_escape(truncate(text, 300))}")

                elif ptype == "thinking":
                    # skip thinking in important mode
                    if filter_mode == "important":
                        continue
                    thinking = part.get("thinking", "")
                    if thinking:
                        parts.append(f"💭 <i>{html_escape(truncate(thinking, 100))}</i>")

                elif ptype == "toolCall":
                    name = part.get("name", "?")
                    args = part.get("arguments", {})
                    summary = format_tool_summary(name, args)
                    # in important mode, only show write/edit/exec/spawn
                    if filter_mode == "important" and name in ("read", "sessions_list", "sessions_history"):
                        continue
                    has_meaningful = True
                    parts.append(summary)

            if not parts:
                return None
            if filter_mode == "important" and not has_meaningful:
                return None

            return f"{prefix} " + "\n".join(parts)

    return None


# ── File watcher (reused from session-monitor) ──────────────────────────────

class SessionWatcher:
    def __init__(self, directory: str, session_filter: str | None = None):
        self.directory = Path(directory)
        self.session_filter = session_filter
        self.offsets: dict[str, int] = {}

    def _should_watch(self, filename: str) -> bool:
        if not filename.endswith(".jsonl"):
            return False
        if ".deleted." in filename or ".lock" in filename:
            return False
        if filename == "sessions.json":
            return False
        if self.session_filter:
            return filename.startswith(self.session_filter)
        return True

    def _session_id_from_file(self, filename: str) -> str:
        return filename.replace(".jsonl", "")

    def scan(self) -> list[tuple[str, dict]]:
        new_entries = []
        for filepath in self.directory.iterdir():
            if not self._should_watch(filepath.name):
                continue
            fpath = str(filepath)
            try:
                current_size = filepath.stat().st_size
            except OSError:
                continue
            last_offset = self.offsets.get(fpath, 0)
            if current_size <= last_offset:
                continue
            session_id = self._session_id_from_file(filepath.name)
            try:
                with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                    f.seek(last_offset)
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entry = json.loads(line)
                            new_entries.append((session_id, entry))
                        except json.JSONDecodeError:
                            pass
                    self.offsets[fpath] = f.tell()
            except (OSError, IOError):
                pass
        new_entries.sort(key=lambda x: x[1].get("timestamp", ""))
        return new_entries

    def init_from_end(self):
        """Start watching from end of all files (only new entries)."""
        for filepath in self.directory.iterdir():
            if not self._should_watch(filepath.name):
                continue
            fpath = str(filepath)
            try:
                self.offsets[fpath] = filepath.stat().st_size
            except OSError:
                self.offsets[fpath] = 0


# ── Topic manager ────────────────────────────────────────────────────────────

class TopicManager:
    """Manages session → Telegram forum topic mapping."""

    def __init__(self, tg: TelegramAPI, session_dir: str, state_path: str | None = None):
        self.tg = tg
        self.session_dir = session_dir
        self.state_path = state_path
        self.sessions_index: dict = {}
        # session_id → thread_id
        self.topic_map: dict[str, int] = {}
        # session_id → topic_name (for display)
        self.topic_names: dict[str, str] = {}
        # topic_name → thread_id (allow sessions with same name to share one topic)
        self.topic_name_map: dict[str, int] = {}
        self._load_state()
        self._refresh_index()

    def _refresh_index(self):
        self.sessions_index = load_sessions_index(self.session_dir)

    def _load_state(self):
        if self.state_path and os.path.exists(self.state_path):
            try:
                with open(self.state_path, "r") as f:
                    data = json.load(f)
                self.topic_map = data.get("topic_map", {})
                self.topic_names = data.get("topic_names", {})
                self.topic_name_map = data.get("topic_name_map", {})
                if not self.topic_name_map and self.topic_map and self.topic_names:
                    # Backfill from older state schema.
                    for sid, thread_id in self.topic_map.items():
                        name = self.topic_names.get(sid)
                        if isinstance(name, str) and name:
                            self.topic_name_map[name] = thread_id
                print(f"  Loaded {len(self.topic_map)} topic mappings from state", flush=True)
            except Exception as e:
                print(f"  Warning: failed to load state: {e}", file=sys.stderr)

    def _save_state(self):
        if not self.state_path:
            return
        try:
            with open(self.state_path, "w") as f:
                json.dump({
                    "topic_map": self.topic_map,
                    "topic_names": self.topic_names,
                    "topic_name_map": self.topic_name_map,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"  Warning: failed to save state: {e}", file=sys.stderr)

    def get_or_create_topic(self, session_id: str) -> int | None:
        """Get existing topic thread_id or create a new one."""
        if session_id in self.topic_map:
            return self.topic_map[session_id]

        # refresh index in case new sessions appeared
        self._refresh_index()

        topic_name = derive_topic_name(session_id, self.session_dir, self.sessions_index)
        sid = short_id(session_id)
        full_name = topic_name

        # Reuse existing thread for same topic name.
        existing_thread = self.topic_name_map.get(full_name)
        if existing_thread is not None:
            self.topic_map[session_id] = existing_thread
            self.topic_names[session_id] = full_name
            self._save_state()
            return existing_thread

        cat = session_category(session_id, self.sessions_index)
        color = TOPIC_COLORS.get(cat, TOPIC_COLORS["other"])

        print(f"  Creating topic: {full_name} (cat={cat})", flush=True)
        thread_id = self.tg.create_forum_topic(full_name, icon_color=color)

        if thread_id is not None:
            self.topic_map[session_id] = thread_id
            self.topic_names[session_id] = full_name
            self.topic_name_map[full_name] = thread_id
            self._save_state()
            return thread_id

        print(f"  Failed to create topic for {sid}", file=sys.stderr)
        return None

    def is_main_session(self, session_id: str) -> bool:
        """
        Return True when session_id maps to agent:main:main.
        We skip these to avoid forwarding operator/main control chatter to TG.
        """
        self._refresh_index()
        for key, meta in self.sessions_index.items():
            if key == "agent:main:main" and meta.get("sessionId", "").startswith(session_id[:8]):
                return True
        return False


# ── Message batcher ──────────────────────────────────────────────────────────

class MessageBatcher:
    """
    Batches multiple entries for the same session into a single TG message
    to reduce API calls and improve readability.
    """

    def __init__(self, max_lines: int = 15, max_chars: int = 3500):
        self.max_lines = max_lines
        self.max_chars = max_chars
        # session_id → list of formatted lines
        self.buffers: dict[str, list[str]] = defaultdict(list)

    def add(self, session_id: str, line: str):
        self.buffers[session_id].append(line)

    def flush_all(self) -> dict[str, list[str]]:
        """
        Flush all buffers. Returns {session_id: [message_text, ...]}.
        Each message_text is within TG limits.
        """
        result: dict[str, list[str]] = {}
        for sid, lines in self.buffers.items():
            if not lines:
                continue
            messages = []
            current = []
            current_len = 0
            for line in lines:
                line_len = len(line) + 1  # +1 for newline
                if current and (len(current) >= self.max_lines or current_len + line_len > self.max_chars):
                    messages.append("\n".join(current))
                    current = []
                    current_len = 0
                current.append(line)
                current_len += line_len
            if current:
                messages.append("\n".join(current))
            result[sid] = messages
        self.buffers.clear()
        return result


# ── Main ─────────────────────────────────────────────────────────────────────

def load_bot_token(config_path: str | None, session_dir: str) -> str | None:
    """Auto-detect bot token from openclaw.json."""
    candidates = []
    if config_path:
        candidates.append(config_path)
    # try relative to session dir
    candidates.append(str(Path(session_dir).parent.parent.parent / "openclaw.json"))
    # try data/.openclaw/openclaw.json
    candidates.append(str(Path(session_dir).parent.parent.parent / "openclaw.json"))

    for path in candidates:
        try:
            with open(path, "r") as f:
                data = json.load(f)
            token = data.get("channels", {}).get("telegram", {}).get("botToken")
            if token:
                print(f"  Bot token loaded from {path}")
                return token
        except Exception:
            pass
    return None


def main():
    parser = argparse.ArgumentParser(description="OpenClaw Session → Telegram Forum Sync")
    parser.add_argument(
        "--dir", default="data/.openclaw/agents/main/sessions",
        help="Session directory path",
    )
    parser.add_argument("--interval", type=float, default=2.0, help="Poll interval (seconds)")
    parser.add_argument("--config", default=None, help="Path to openclaw.json")
    parser.add_argument("--chat-id", type=int, default=-1003837358001, help="Telegram group chat ID")
    parser.add_argument("--dry-run", action="store_true", help="Print instead of sending")
    parser.add_argument("--batch-delay", type=float, default=0.3, help="Delay between TG API calls")
    parser.add_argument(
        "--filter", dest="filter_mode", default="important",
        choices=["all", "message", "tool", "important"],
        help="Filter mode (important = user/assistant messages + write/exec/spawn tools)",
    )
    parser.add_argument("--state", default=None, help="State file path for topic persistence")
    parser.add_argument("--session", default=None, help="Only watch specific session (prefix)")
    args = parser.parse_args()

    # resolve directory
    session_dir = args.dir
    if not os.path.isabs(session_dir):
        script_dir = Path(__file__).resolve().parent.parent
        candidate = script_dir / session_dir
        if candidate.is_dir():
            session_dir = str(candidate)
        elif not Path(session_dir).is_dir():
            print(f"Error: directory not found: {session_dir}", file=sys.stderr)
            sys.exit(1)

    # default state file next to session dir
    state_path = args.state
    if not state_path:
        state_path = str(Path(session_dir) / ".tg-sync-state.json")

    # load bot token
    bot_token = load_bot_token(args.config, session_dir)
    if not bot_token and not args.dry_run:
        print("Error: could not find Telegram bot token. Use --config or --dry-run.", file=sys.stderr)
        sys.exit(1)

    tg = TelegramAPI(bot_token or "", args.chat_id, dry_run=args.dry_run)
    topic_mgr = TopicManager(tg, session_dir, state_path=state_path)
    watcher = SessionWatcher(session_dir, session_filter=args.session)
    batcher = MessageBatcher()

    # start from end — only forward new entries
    watcher.init_from_end()

    def log(msg: str):
        print(msg, flush=True)

    log(f"🔄 Session → Telegram Sync started")
    log(f"   Directory: {session_dir}")
    log(f"   Chat ID:   {args.chat_id}")
    log(f"   Filter:    {args.filter_mode}")
    log(f"   State:     {state_path}")
    log(f"   Dry-run:   {args.dry_run}")
    log(f"   Interval:  {args.interval}s")
    log("")

    stats = {"sent": 0, "skipped": 0, "errors": 0, "topics_created": 0}

    try:
        while True:
            new_entries = watcher.scan()

            if not new_entries:
                time.sleep(args.interval)
                continue

            # process entries into batched messages per session
            for session_id, entry in new_entries:
                if topic_mgr.is_main_session(session_id):
                    stats["skipped"] += 1
                    continue
                tg_msg = entry_to_tg_message(entry, args.filter_mode)
                if tg_msg:
                    batcher.add(session_id, tg_msg)
                else:
                    stats["skipped"] += 1

            # flush and send
            batched = batcher.flush_all()
            for session_id, messages in batched.items():
                thread_id = topic_mgr.get_or_create_topic(session_id)
                if thread_id is None:
                    stats["errors"] += len(messages)
                    continue

                for msg_text in messages:
                    ok = tg.send_message(msg_text, thread_id)
                    if ok:
                        stats["sent"] += 1
                    else:
                        stats["errors"] += 1
                    time.sleep(args.batch_delay)

            # periodic status
            total = stats["sent"] + stats["skipped"] + stats["errors"]
            if total > 0 and total % 50 == 0:
                log(
                    f"  📊 sent={stats['sent']} skipped={stats['skipped']} "
                    f"errors={stats['errors']} topics={len(topic_mgr.topic_map)}"
                )

            time.sleep(args.interval)

    except KeyboardInterrupt:
        log(f"\n📊 Final: sent={stats['sent']} skipped={stats['skipped']} "
            f"errors={stats['errors']} topics={len(topic_mgr.topic_map)}")
        log("Sync stopped.")


if __name__ == "__main__":
    main()
