---
name: apple-reminders
description: Manage Apple Reminders via the `remind` CLI on macOS (list, add, complete, edit, delete). Supports filtering by list, date ranges, priorities, and JSON output for scripting.
homepage: https://github.com/migueravila/remind
metadata: {"clawdis":{"emoji":"⏰","os":["darwin"],"requires":{"bins":["remind"]},"install":[{"id":"source","kind":"script","script":"cd /tmp && git clone https://github.com/migueravila/remind.git && cd remind && swift build -c release && mkdir -p ~/.local/bin && cp .build/release/remind ~/.local/bin/remind","bins":["remind"],"label":"Build remind from source (requires Swift 6.0+)"}]}}
---

# Apple Reminders CLI

Use `remind` to manage Apple Reminders from the terminal. Built in Swift for native performance.

## Requirements
- macOS 13.0+
- Swift 6.0+ (for building from source)
- Reminders.app permission (grant on first run)

## Installation

```bash
git clone https://github.com/migueravila/remind.git
cd remind
swift build -c release
cp .build/release/remind ~/.local/bin/remind
```

## Quick Reference

```bash
remind                          # Show today's reminders
remind [filter]                 # Filter: today/tomorrow/week/overdue/upcoming/flag
remind list                     # Show all lists with counts
remind list [name]              # Show reminders in specific list
remind add [title]              # Add a reminder
remind complete [id...]         # Mark reminders complete
remind edit [id]                # Edit a reminder
remind delete [id...]           # Delete reminders
```

## Show Reminders

```bash
remind                      # Today's reminders (default)
remind today                # Today's reminders
remind tomorrow             # Tomorrow's reminders  
remind week                 # This week's reminders
remind overdue              # Overdue reminders
remind upcoming             # All upcoming reminders
remind flag                 # Flagged reminders
remind 25-12-24             # Specific date (DD-MM-YY)
```

### Aliases
- `remind t` → tomorrow
- `remind w` → week
- `remind o` → overdue
- `remind u` → upcoming
- `remind f` → flagged

## Manage Lists

```bash
remind list                 # Show all lists with task counts
remind lists                # Alias
remind l                    # Alias
remind list Work            # Show reminders in "Work" list
remind list "Shopping List" # Quotes for names with spaces
```

### Create/Rename/Delete Lists
```bash
remind list Projects              # Creates list if doesn't exist
remind list Work -r "Office"      # Rename list
remind list Work -d               # Delete list
```

## Add Reminders

### Interactive Mode
```bash
remind add                  # Prompts for title, list, date, notes, priority
remind a                    # Alias
```

### Direct Mode
```bash
remind add "Buy groceries"
remind add "Call mom" -l Personal
remind add "Meeting" -l Work -d tomorrow
remind add "Urgent task" -l Work -d 2024-12-25 -p high
remind add "Review docs" -l Work -f
remind add "Project notes" -l Work -n "Include Q4 figures"
```

### Flags
| Flag | Long | Description |
|------|------|-------------|
| `-l` | `--list` | Target list name |
| `-d` | `--due` | Due date (today/tomorrow/2024-12-25) |
| `-p` | `--priority` | none/low/medium/high |
| `-f` | `--flag` | Mark as flagged |
| `-n` | `--notes` | Add notes |

### Date Formats
```bash
-d today
-d tomorrow
-d 2024-12-25
-d 25-12-24
-d "2024-12-25 14:30"
```

## Complete Reminders

```bash
remind complete 1           # Complete by position number
remind complete 1 2 3       # Complete multiple
remind complete 4A83        # Complete by partial ID (4+ chars)
remind c 1                  # Alias
remind done 1               # Alias
```

## Edit Reminders

```bash
remind edit 1               # Interactive edit
remind e 1                  # Alias
remind edit 1 -t "New title"
remind edit 1 -l "New List" # Move to different list
remind edit 1 -d tomorrow
remind edit 1 -p high
remind edit 1 -f            # Toggle flagged
```

## Delete Reminders

```bash
remind delete 1             # Delete (with confirmation)
remind delete 1 2 3         # Delete multiple
remind delete 4A83          # Delete by partial ID
remind delete 1 --force     # Skip confirmation
remind d 1                  # Alias
remind rm 1                 # Alias
```

## JSON Output

For scripting and automation:

```bash
remind --json               # All today's reminders as JSON
remind list Work --json     # List reminders as JSON
remind overdue --json       # Overdue as JSON
```

### Scripting Examples
```bash
# Count overdue reminders
remind overdue --json | jq length

# Get random task from a list
remind list Personal --json | jq -r '.[].title' | shuf -n 1

# Export all reminders
remind upcoming --json > backup.json

# Complete all in a list
remind list Work --json | jq -r '.[].id' | xargs remind complete
```

## Output Format

Default output shows:
- Title (truncated to 35 chars)
- Completion status (○ pending, ✓ done)
- Short ID (4 chars)
- List name
- Priority level
- Due date (relative)
- Notes indicator

```
Buy groceries                      ○ 4A83 | Shopping | !none   | tomorrow
Call mom                           ○ 7B21 | Personal | !high   | today
```

### Format Options
```bash
remind --json               # JSON output
remind --plain              # No colors
remind --quiet              # Minimal output
```

## Configuration

### Environment Variables
```bash
REMIND_DEFAULT_LIST="Personal"      # Default list for new reminders
REMIND_DATE_FORMAT="DD-MM-YY"       # Preferred date format
REMIND_COLOR="auto"                 # auto/always/never
```

### Config File
`~/.config/remind/config.yaml`:
```yaml
default_list: Personal
date_format: DD-MM-YY
color: auto
confirm_delete: true
```

## Troubleshooting

### "Access to Reminders denied"
1. System Settings → Privacy & Security → Reminders
2. Enable access for Terminal (or your terminal app)

### Command not found
Ensure `~/.local/bin` is in your PATH:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Why remind over memo?

| Feature | remind | memo rem |
|---------|--------|----------|
| List folders | ✅ `remind list` | ❌ |
| Filter by list | ✅ `remind list Work` | ❌ |
| JSON output | ✅ `--json` | ❌ |
| Date filters | ✅ today/week/overdue | ❌ |
| Due dates | ✅ flexible formats | ❌ |
| Priorities | ✅ none/low/med/high | ❌ |
| Partial ID match | ✅ 4+ chars | ❌ |
| Native Swift | ✅ fast | Python |
