# Evolution Queue

> Liam: Propose improvements here. Simon reviews and implements approved items.

## How to Submit

**REQUIRED: Verify before submitting.** Run verification command, paste output as evidence.

```
### [YYYY-MM-DD-NNN] Short title
- **Proposed by:** Liam
- **Date:** YYYY-MM-DD
- **Category:** behavior | identity | rules | tools | memory | showcase-idea
- **Target file:** (which file would change, or "new skill")
- **Verified:** [YES - ran grep/command] or [N/A - new feature]
- **Evidence:** `[paste command output showing issue exists]`
- **Description:** What to change and why
- **Status:** pending
```

**Verification commands:**
- "Missing from file X": `grep -n "[feature]" ~/clawd/[file].md`
- "Tool broken": `which [tool] && [tool] --help`
- "Cron failing": `clawdbot cron list | grep [job]`

**RULE:** If grep FINDS the feature, DO NOT create the entry (it's a ghost bug).

**IMPORTANT:** ALL entries (including external reports from Simon/Telegram) should be verified before implementation. Don't assume external reports are accurate - always verify with commands first.

## Pending

### [2026-01-27-045] [RESOLVED] Install ngrok for Phone Dashboard Access
- **Proposed by:** Simon
- **Date:** 2026-01-27
- **Category:** tools
- **Target file:** ~/.local/bin/ngrok
- **Verified:** YES - ngrok installed
- **Description:** Install ngrok to create temporary HTTPS tunnel for dashboard access from phone. Allows accessing http://localhost:8080 from anywhere.
- **Usage:** `ngrok http 8080` - creates HTTPS URL accessible from phone
- **Resolution:** Installed ngrok v3.35.0 to ~/.local/bin/ngrok (2026-01-28)
- **Status:** RESOLVED

### [2026-01-27-044] Message Metadata Mashed Into User Text - CORE Issue (Not Channel-Specific)
- **Proposed by:** Simon
- **Date:** 2026-01-27
- **Category:** tools
- **Target file:** Core message handling (NOT channel-specific)
- **Verified:** YES - confirmed on BOTH Discord AND Telegram
- **Evidence:**
  - Discord: `[Discord gnox8339 user id:393272476416606208 +10s 2026-01-27 21:01 PST] Hi like we just did some updates...`
  - Telegram: `A new session was started via /new or /reset...\n[message_id: 905]`
  - Both channels append/prepend metadata to user text field
  - Model can't distinguish user input from metadata - same field in payload
- **Description:** Message metadata (user ID, message_id, timestamp, channel info) is being mashed into the user text field across ALL channels, not just Discord. The model treats the entire string as user input. This is a core Clawdbot message formatting issue.
- **Root Cause:** Core message formatting logic, NOT channel plugins
- **Note:** SOUL.md context-misinterpretation fix helps but doesn't solve the structural issue.
- **Status:** VERIFIED - Core Clawdbot codebase change required

### [2026-02-10-042] Debug Mode Frequency Reversion (SCHEDULED)
- **Proposed by:** Cursor
- **Date:** 2026-01-28
- **Scheduled for:** 2026-02-10
- **Description:** Revert debug mode frequencies to normal after 2-week dev period. Actions: disable Evening-Self-Audit + Model-Health-Check cron jobs, revert self-evaluation/Queue-Cleanup to Sunday only.
- **Status:** SCHEDULED

### [2026-01-27-038] Telegram Multi-Message Split Formatting
- **Date:** 2026-01-27
- **Description:** Long responses split into multiple Telegram messages may have weird spacing. Investigation found chunking uses `chunkByParagraph()` with whitespace trimming - may not be a real issue.
- **Note:** Test on 2026-01-27 showed perfect formatting. May be content-specific.
- **Status:** NEEDS REPRODUCTION STEPS (screenshot needed)

### [2026-01-25-016] PuenteWorks Documentation Import
- **Proposed by:** Simon (via email)
- **Date:** 2026-01-25
- **Category:** memory
- **Description:** Import PuenteWorks documentation from Simon's Mac/Claude account into Liam's memory.
- **Impact:** High - Critical business context
- **Status:** WAITING ON SIMON (needs to provide files)

### [2026-01-25-007] Low-Friction Capture Methods
- **Proposed by:** Liam
- **Date:** 2026-01-25
- **Category:** tools
- **Description:** NeuroSecond <2 second capture via natural language (Telegram) and email (clawdbot@puenteworks.com).
- **Impact:** High - Critical for NeuroSecond methodology
- **Status:** IN PROGRESS (natural-capture skill)

### [2026-01-27-046] Dashboard Chat Window
- **Proposed by:** Simon (via Telegram)
- **Date:** 2026-01-27
- **Category:** tools
- **Target file:** ~/clawd/dashboard/
- **Description:** Add a chat window to the dashboard that allows chatting with Liam directly from the web interface.
- **Impact:** High - Direct interaction without switching to Telegram/Discord
- **Status:** PENDING

### [2026-01-27-047] Dashboard Session Visibility
- **Proposed by:** Simon (via Telegram)
- **Date:** 2026-01-27
- **Category:** tools
- **Target file:** ~/clawd/dashboard/
- **Description:** Show what all Liam sessions are doing in the dashboard. Display active sessions across all agents (Telegram, Discord, etc.) with their current state.
- **Impact:** Medium - Visibility into agent activity
- **Status:** PENDING

### [2026-01-27-048] Dashboard Subagent Visibility
- **Proposed by:** Simon (via Telegram)
- **Date:** 2026-01-27
- **Category:** tools
- **Target file:** ~/clawd/dashboard/
- **Description:** Show subagent activity in the dashboard. Display spawned subagents, their tasks, and status.
- **Impact:** Medium - Visibility into subagent orchestration
- **Status:** PENDING

### [2026-01-27-049] Dashboard Systemd Service Installation
- **Proposed by:** Cursor
- **Date:** 2026-01-28
- **Category:** tools
- **Target file:** /etc/systemd/system/liam-dashboard.service
- **Description:** Install systemd service so dashboard auto-starts on boot and auto-restarts on crash. Service file exists at ~/clawd/dashboard/liam-dashboard.service but requires sudo to install.
- **Note:** Requires: `sudo cp ~/clawd/dashboard/liam-dashboard.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable liam-dashboard`
- **Status:** PENDING (needs sudo access)

## Paused

### [2026-01-28-043] GLM-4.7-Flash vs Kimi K2.5 Model Comparison
- **Date:** 2026-01-28
- **Description:** Compare models for Discord Liam. Postponed - maxed out GLM-4.7-Flash first.
- **Status:** PAUSED (revisit after testing current config)

### [2026-01-25-019] Digital Download Business Research
- **Date:** 2026-01-25
- **Description:** Research digital download business ideas as secondary income. Full analysis delivered with 7+ ideas.
- **Status:** PAUSED per Simon

### [2026-01-25-018] Edison Learning Operations Job
- **Date:** 2026-01-25
- **Description:** Track Edison Learning Operations Senior Specialist opportunity (interviewed 2026-01-23).
- **Status:** PAUSED per Simon

## Approved

*(No approved items pending implementation)*

---

*Implemented and rejected items moved to EVOLUTION-QUEUE-ARCHIVE.md*
