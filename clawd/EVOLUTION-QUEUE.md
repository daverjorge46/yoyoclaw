# Evolution Queue

> System improvements — how Liam works, multi-agent coordination, tools, infra.
> For Liam's projects and ventures, see `PROJECTS.md`.

---

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

---

## Queue Hygiene Rules

**RULE: Resolved items must be archived immediately.**

The Evolution Queue should ONLY contain:
- **NEW** - Not yet started
- **IN PROGRESS** - Currently being worked on
- **PENDING** - Waiting on external input (Simon, etc.)
- **SCHEDULED** - Future dated items
- **PAUSED** - Deliberately paused, will resume later

Items with these statuses must be moved to `EVOLUTION-QUEUE-ARCHIVE.md`:
- **RESOLVED** - Successfully completed
- **CANNOT REPRODUCE** - Unable to verify issue
- **REJECTED** - Will not implement
- **DUPLICATE** - Already covered by another item
- **GHOST BUG** - Feature already exists

---

## Pending (System)

### [2026-02-10-042] Debug Mode Frequency Reversion (SCHEDULED)
- **Proposed by:** Cursor
- **Date:** 2026-01-28
- **Scheduled for:** 2026-02-10
- **Description:** Revert debug mode frequencies to normal after 2-week dev period. Actions: disable Evening-Self-Audit + Model-Health-Check cron jobs, revert self-evaluation/Queue-Cleanup to Sunday only.
- **Status:** SCHEDULED

---

## In Progress

### [2026-01-25-007] Low-Friction Capture Methods
- **Proposed by:** Liam
- **Date:** 2026-01-25
- **Category:** tools
- **Description:** NeuroSecond <2 second capture via natural language (Telegram) and email (clawdbot@puenteworks.com).
- **Impact:** High - Critical for NeuroSecond methodology
- **Status:** IN PROGRESS (natural-capture skill)

---

## Paused

*(No paused items)*

---

## Approved

*(No approved items pending implementation)*

---

*For Liam's projects and ventures, see PROJECTS.md*
