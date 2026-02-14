#!/usr/bin/env python3
"""
OpenClaw Session Monitor — Layout C: Activity Feed + Stats
Watches all .jsonl session files for updates and displays a live activity feed.

Usage:
  python3 scripts/session-monitor.py [OPTIONS]

Options:
  --dir DIR        Session directory (default: data/.openclaw/agents/main/sessions)
  --lines N        Max feed lines to display (default: 30)
  --interval S     Refresh interval in seconds (default: 1.0)
  --no-color       Disable ANSI colors
  --filter TYPE    Filter by entry type: message,tool,model,all (default: all)
  --session ID     Only watch a specific session (prefix match)
"""

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# ── ANSI colors ──────────────────────────────────────────────────────────────

class C:
    """ANSI color codes."""
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    DIM     = "\033[2m"
    # foreground
    RED     = "\033[31m"
    GREEN   = "\033[32m"
    YELLOW  = "\033[33m"
    BLUE    = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN    = "\033[36m"
    WHITE   = "\033[37m"
    GRAY    = "\033[90m"
    # bg
    BG_DARK = "\033[48;5;235m"

    @classmethod
    def disable(cls):
        for attr in dir(cls):
            if attr.isupper() and not attr.startswith("_"):
                setattr(cls, attr, "")


# ── Helpers ──────────────────────────────────────────────────────────────────

def short_id(session_id: str) -> str:
    """First 8 chars of session UUID."""
    return session_id[:8] if len(session_id) > 8 else session_id


def fmt_time(ts_str: str) -> str:
    """ISO timestamp → HH:MM:SS local time."""
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        local = dt.astimezone()
        return local.strftime("%H:%M:%S")
    except Exception:
        return ts_str[:8] if ts_str else "??:??:??"


def truncate(text: str, max_len: int = 80) -> str:
    """Truncate text with ellipsis."""
    text = text.replace("\n", " ").strip()
    if len(text) > max_len:
        return text[: max_len - 1] + "…"
    return text


def format_tool_summary(name: str, args: dict) -> str:
    """Summarize a tool call."""
    if name == "read":
        path = args.get("file_path", args.get("path", "?"))
        return f"read → {os.path.basename(path)}"
    if name == "write":
        path = args.get("file_path", args.get("path", "?"))
        return f"write → {os.path.basename(path)}"
    if name == "edit":
        path = args.get("file_path", args.get("path", "?"))
        return f"edit → {os.path.basename(path)}"
    if name == "exec":
        cmd = args.get("command", "?")
        return f"exec → {truncate(cmd, 50)}"
    if name == "process":
        cmd = args.get("command", args.get("action", "?"))
        return f"process → {truncate(str(cmd), 50)}"
    if name == "sessions_list":
        return "sessions_list"
    if name == "sessions_history":
        key = args.get("sessionKey", "?")
        return f"sessions_history → {short_id(key)}"
    if name == "sessions_spawn":
        label = args.get("label", "?")
        return f"sessions_spawn → {label}"
    # generic
    arg_preview = ", ".join(f"{k}={truncate(str(v),20)}" for k, v in list(args.items())[:2])
    return f"{name}({arg_preview})"


# ── Entry parser ─────────────────────────────────────────────────────────────

ICON_USER  = "👤"
ICON_ASST  = "💬"
ICON_THINK = "💭"
ICON_TOOL  = "🔧"
ICON_RESULT = "↳ "
ICON_MODEL = "⚙️"
ICON_SESSION = "📋"


def parse_entry(entry: dict, session_id: str) -> list[dict]:
    """
    Parse a JSONL entry into display items.
    Returns list of {time, sid, icon, color, text, entry_type}.
    """
    items = []
    ts = fmt_time(entry.get("timestamp", ""))
    sid = short_id(session_id)
    etype = entry.get("type", "?")

    if etype == "session":
        items.append({
            "time": ts, "sid": sid, "icon": ICON_SESSION,
            "color": C.CYAN, "text": f"session started (cwd: {entry.get('cwd', '?')})",
            "entry_type": "session",
        })

    elif etype == "model_change":
        provider = entry.get("provider", "?")
        model = entry.get("modelId", "?")
        items.append({
            "time": ts, "sid": sid, "icon": ICON_MODEL,
            "color": C.MAGENTA, "text": f"model → {provider}/{model}",
            "entry_type": "model",
        })

    elif etype == "thinking_level_change":
        level = entry.get("thinkingLevel", "?")
        items.append({
            "time": ts, "sid": sid, "icon": ICON_MODEL,
            "color": C.MAGENTA, "text": f"thinking → {level}",
            "entry_type": "model",
        })

    elif etype == "message":
        msg = entry.get("message", {})
        role = msg.get("role", "?")
        content = msg.get("content", "")

        if isinstance(content, str):
            # simple string content
            icon = ICON_USER if role == "user" else ICON_ASST
            color = C.GREEN if role == "user" else C.BLUE
            items.append({
                "time": ts, "sid": sid, "icon": icon,
                "color": color, "text": f"{role}: {truncate(content)}",
                "entry_type": "message",
            })
        elif isinstance(content, list):
            for part in content:
                ptype = part.get("type", "?")

                if ptype == "text":
                    text = part.get("text", "")
                    if role == "user":
                        items.append({
                            "time": ts, "sid": sid, "icon": ICON_USER,
                            "color": C.GREEN,
                            "text": f"user: {truncate(text)}",
                            "entry_type": "message",
                        })
                    else:
                        items.append({
                            "time": ts, "sid": sid, "icon": ICON_ASST,
                            "color": C.BLUE,
                            "text": f"asst: {truncate(text)}",
                            "entry_type": "message",
                        })

                elif ptype == "thinking":
                    thinking = part.get("thinking", "")
                    if thinking:
                        items.append({
                            "time": ts, "sid": sid, "icon": ICON_THINK,
                            "color": C.GRAY,
                            "text": f"think: {truncate(thinking, 60)}",
                            "entry_type": "message",
                        })

                elif ptype == "toolCall":
                    name = part.get("name", "?")
                    args = part.get("arguments", {})
                    summary = format_tool_summary(name, args)
                    items.append({
                        "time": ts, "sid": sid, "icon": ICON_TOOL,
                        "color": C.YELLOW,
                        "text": summary,
                        "entry_type": "tool",
                    })

            # toolResult role — show result preview
            if role == "toolResult":
                # clear any non-toolResult items we may have added
                items.clear()
                for part in content:
                    if part.get("type") == "text":
                        text = part.get("text", "")
                        preview = truncate(text, 60)
                        items.append({
                            "time": ts, "sid": sid, "icon": "",
                            "color": C.DIM,
                            "text": f"  {ICON_RESULT}{preview}",
                            "entry_type": "tool",
                        })
                        break

    elif etype == "custom":
        custom_type = entry.get("customType", "?")
        if custom_type != "model-snapshot":
            data_preview = truncate(json.dumps(entry.get("data", {})), 60)
            items.append({
                "time": ts, "sid": sid, "icon": "📦",
                "color": C.GRAY, "text": f"{custom_type}: {data_preview}",
                "entry_type": "model",
            })

    return items


# ── Stats tracker ────────────────────────────────────────────────────────────

class Stats:
    def __init__(self):
        self.active_sessions: dict[str, str] = {}   # sid → last timestamp
        self.models: dict[str, int] = defaultdict(int)  # model → count
        self.tool_calls = 0
        self.messages_1m = []  # timestamps of messages in last 60s
        self.total_entries = 0

    def record_entry(self, entry: dict, session_id: str):
        ts = entry.get("timestamp", "")
        self.active_sessions[short_id(session_id)] = ts
        self.total_entries += 1

        now = time.time()
        self.messages_1m = [t for t in self.messages_1m if now - t < 60]
        self.messages_1m.append(now)

        etype = entry.get("type", "?")
        if etype == "model_change":
            model = entry.get("modelId", "?")
            self.models[model] += 1
        elif etype == "message":
            msg = entry.get("message", {})
            if isinstance(msg.get("content"), list):
                for part in msg["content"]:
                    if part.get("type") == "toolCall":
                        self.tool_calls += 1

    def render_bar(self, term_width: int) -> str:
        """Render the stats header bar."""
        # count recently active sessions (last 5 min)
        now_iso = datetime.now(timezone.utc).isoformat()
        active = len(self.active_sessions)
        msgs_min = len(self.messages_1m)

        # model distribution
        model_str = " ".join(
            f"{m}({c})" for m, c in sorted(self.models.items(), key=lambda x: -x[1])[:3]
        )

        line1 = (
            f"{C.BOLD}{C.CYAN}╔═{C.RESET}"
            f" Active: {C.BOLD}{active}{C.RESET}"
            f" │ Msgs/min: {C.BOLD}{msgs_min}{C.RESET}"
            f" │ Tools: {C.BOLD}{self.tool_calls}{C.RESET} calls"
            f" │ Total: {C.BOLD}{self.total_entries}{C.RESET}"
            f" {C.CYAN}═╗{C.RESET}"
        )
        line2 = (
            f"{C.CYAN}║{C.RESET}"
            f" Models: {C.DIM}{model_str or 'n/a'}{C.RESET}"
            f" │ {C.DIM}{datetime.now().strftime('%H:%M:%S')}{C.RESET}"
            f" {C.CYAN}║{C.RESET}"
        )
        line3 = f"{C.CYAN}╚{'═' * (term_width - 2)}╝{C.RESET}"

        return f"{line1}\n{line2}\n{line3}"


# ── File watcher ─────────────────────────────────────────────────────────────

class SessionWatcher:
    """Watch .jsonl files for new lines using file offsets."""

    def __init__(self, directory: str, session_filter: str | None = None):
        self.directory = Path(directory)
        self.session_filter = session_filter
        self.offsets: dict[str, int] = {}  # filepath → last read offset

    def _should_watch(self, filename: str) -> bool:
        """Only watch active .jsonl files (not deleted)."""
        if not filename.endswith(".jsonl"):
            return False
        if ".deleted." in filename:
            return False
        if ".lock" in filename:
            return False
        if filename == "sessions.json":
            return False
        if self.session_filter:
            return filename.startswith(self.session_filter)
        return True

    def _session_id_from_file(self, filename: str) -> str:
        return filename.replace(".jsonl", "")

    def scan(self) -> list[tuple[str, dict]]:
        """Scan for new entries. Returns [(session_id, entry), ...]."""
        new_entries = []

        for filepath in self.directory.iterdir():
            if not self._should_watch(filepath.name):
                continue

            fpath = str(filepath)
            current_size = filepath.stat().st_size
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

        # sort by timestamp
        new_entries.sort(key=lambda x: x[1].get("timestamp", ""))
        return new_entries

    def init_offsets(self, tail_lines: int = 20):
        """
        Initialize offsets to near-end of each file so we show
        recent history on startup instead of replaying everything.
        """
        for filepath in self.directory.iterdir():
            if not self._should_watch(filepath.name):
                continue
            fpath = str(filepath)
            try:
                size = filepath.stat().st_size
                if tail_lines == 0:
                    # start from end, only show new
                    self.offsets[fpath] = size
                else:
                    # read last N lines
                    with open(fpath, "rb") as f:
                        # seek backwards to find N newlines
                        if size == 0:
                            self.offsets[fpath] = 0
                            continue
                        pos = size
                        lines_found = 0
                        while pos > 0 and lines_found < tail_lines + 1:
                            pos = max(pos - 4096, 0)
                            f.seek(pos)
                            chunk = f.read(min(4096, size - pos))
                            lines_found += chunk.count(b"\n")
                        # now find the exact offset for tail_lines
                        f.seek(pos)
                        all_data = f.read().decode("utf-8", errors="replace")
                        lines = all_data.split("\n")
                        # keep last tail_lines non-empty lines
                        non_empty = [l for l in lines if l.strip()]
                        if len(non_empty) > tail_lines:
                            skip = len(non_empty) - tail_lines
                            # calculate byte offset
                            offset = pos
                            f.seek(pos)
                            for i, line in enumerate(lines):
                                if line.strip():
                                    skip -= 1
                                    if skip <= 0:
                                        break
                                offset += len(line.encode("utf-8")) + 1
                            self.offsets[fpath] = min(offset, size)
                        else:
                            self.offsets[fpath] = pos
            except (OSError, IOError):
                self.offsets[fpath] = 0


# ── Renderer ─────────────────────────────────────────────────────────────────

class Renderer:
    def __init__(self, max_lines: int = 30, entry_filter: str = "all"):
        self.max_lines = max_lines
        self.entry_filter = entry_filter
        self.feed: list[dict] = []

    def add_items(self, items: list[dict]):
        for item in items:
            if self.entry_filter != "all":
                if self.entry_filter == "message" and item["entry_type"] not in ("message",):
                    continue
                if self.entry_filter == "tool" and item["entry_type"] not in ("tool",):
                    continue
                if self.entry_filter == "model" and item["entry_type"] not in ("model", "session"):
                    continue
            self.feed.append(item)
        # trim to max
        if len(self.feed) > self.max_lines * 2:
            self.feed = self.feed[-self.max_lines:]

    def render_feed(self) -> str:
        lines = []
        visible = self.feed[-self.max_lines:]
        for item in visible:
            sid_str = f"{C.DIM}{item['sid']}{C.RESET}"
            time_str = f"{C.GRAY}[{item['time']}]{C.RESET}"
            icon = item["icon"]
            color = item["color"]
            text = f"{color}{item['text']}{C.RESET}"
            lines.append(f"  {time_str} {sid_str} {icon} {text}")

        if not lines:
            lines.append(f"  {C.DIM}--- waiting for activity ---{C.RESET}")
        else:
            lines.append(f"  {C.DIM}--- tailing ({len(self.feed)} entries) ---{C.RESET}")

        return "\n".join(lines)


# ── Main loop ────────────────────────────────────────────────────────────────

def _init_model_stats(session_dir: str, stats: Stats):
    """Scan session headers to populate model stats on startup."""
    p = Path(session_dir)
    for filepath in p.iterdir():
        if not filepath.name.endswith(".jsonl") or ".deleted." in filepath.name or ".lock" in filepath.name:
            continue
        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                for i, line in enumerate(f):
                    if i > 10:
                        break
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        if entry.get("type") == "model_change":
                            model = entry.get("modelId", "?")
                            stats.models[model] += 1
                            sid = filepath.name.replace(".jsonl", "")
                            stats.active_sessions[short_id(sid)] = entry.get("timestamp", "")
                    except json.JSONDecodeError:
                        pass
        except (OSError, IOError):
            pass


def clear_screen():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()


def get_term_width() -> int:
    try:
        return os.get_terminal_size().columns
    except OSError:
        return 80


def main():
    parser = argparse.ArgumentParser(description="OpenClaw Session Monitor (Layout C)")
    parser.add_argument(
        "--dir", default="data/.openclaw/agents/main/sessions",
        help="Session directory path",
    )
    parser.add_argument("--lines", type=int, default=30, help="Max feed lines")
    parser.add_argument("--interval", type=float, default=1.0, help="Refresh interval (seconds)")
    parser.add_argument("--no-color", action="store_true", help="Disable colors")
    parser.add_argument(
        "--filter", dest="entry_filter", default="all",
        choices=["all", "message", "tool", "model"],
        help="Filter entry types",
    )
    parser.add_argument("--session", default=None, help="Filter by session ID prefix")
    parser.add_argument(
        "--tail", type=int, default=10,
        help="Number of recent lines per file on startup (0 = only new)",
    )
    args = parser.parse_args()

    if args.no_color:
        C.disable()

    # resolve directory
    session_dir = args.dir
    if not os.path.isabs(session_dir):
        # try relative to script location, then cwd
        script_dir = Path(__file__).resolve().parent.parent
        candidate = script_dir / session_dir
        if candidate.is_dir():
            session_dir = str(candidate)
        elif not Path(session_dir).is_dir():
            print(f"Error: directory not found: {session_dir}", file=sys.stderr)
            sys.exit(1)

    watcher = SessionWatcher(session_dir, session_filter=args.session)
    stats = Stats()
    renderer = Renderer(max_lines=args.lines, entry_filter=args.entry_filter)

    # init: read recent tail
    watcher.init_offsets(tail_lines=args.tail)

    # also do a quick scan of session headers (first few lines) for model info
    _init_model_stats(session_dir, stats)

    print(f"{C.BOLD}OpenClaw Session Monitor{C.RESET} — watching {session_dir}")
    print(f"Press {C.BOLD}Ctrl+C{C.RESET} to exit.\n")

    try:
        while True:
            new_entries = watcher.scan()

            # limit initial burst to last N*2 entries
            if len(new_entries) > args.lines * 3:
                new_entries = new_entries[-(args.lines * 2):]

            for session_id, entry in new_entries:
                stats.record_entry(entry, session_id)
                items = parse_entry(entry, session_id)
                renderer.add_items(items)

            # render
            term_width = get_term_width()
            clear_screen()

            # header
            print(stats.render_bar(term_width))
            print()

            # feed
            print(renderer.render_feed())

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print(f"\n{C.DIM}Monitor stopped.{C.RESET}")


if __name__ == "__main__":
    main()
