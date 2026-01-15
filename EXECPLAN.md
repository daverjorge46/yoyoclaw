# Fix Telegram dock command registration

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

PLANS.md reference: `/Users/georgepickett/.clawdbot/workspace/skills/issue-fixer/PLANS.md`. This document is maintained according to that specification.

## Purpose / Big Picture

Telegram rejects bot commands that contain hyphens, which makes Clawdbot fail during startup when it registers dock commands like `dock-telegram`. After this change, Telegram command registration succeeds because the native command name uses underscores while the text alias remains unchanged, so users can still type `/dock-telegram` in chat and the gateway does not log `BOT_COMMAND_INVALID` errors.

## Progress

- [x] (2026-01-15 04:02Z) Located dock native command registration in `src/auto-reply/commands-registry.data.ts`.
- [x] (2026-01-15 04:03Z) Updated dock `nativeName` to use underscores for Telegram compatibility.
- [x] (2026-01-15 04:13Z) Ran `pnpm test` to validate registry change.
- [x] (2026-01-15 04:18Z) Ran oxfmt to resolve repo formatting issues.
- [x] (2026-01-15 04:20Z) Pushed branch to `grp06` and opened PR #929.
- [ ] Run Telegram-configured startup to confirm no `BOT_COMMAND_INVALID` during `setMyCommands`.

## Surprises & Discoveries

- Observation: Telegram only permits lowercase letters, digits, and underscores in command names; hyphens trigger `BOT_COMMAND_INVALID`.
  Evidence: GitHub issue #901 description.
- Observation: `pnpm format` (check-only) failed due to formatting drift in `src/agents/pi-tools.policy.ts` and `src/agents/pi-tools.ts`.
  Evidence: `oxfmt --check` reported issues in those files during formatting run.
- Observation: Push to `itsgeorgep` remote failed with `Repository not found`.
  Evidence: `git push itsgeorgep fix-telegram-command` returned 404.
- Observation: PR opened at https://github.com/clawdbot/clawdbot/pull/929 after pushing to `grp06`.
  Evidence: `gh pr create` returned the PR URL.

## Decision Log

- Decision: Change only the `nativeName` format to `dock_${dock.id}` and keep `textAlias` as `/dock-${dock.id}` to preserve user-facing syntax.
  Rationale: Telegram validates only the native command name; changing the alias would be a breaking UX change.
  Date/Author: 2026-01-15 / Nexus

## Outcomes & Retrospective

- Outcome: Implemented Telegram-compatible native command naming for dock commands and ran the full test suite; Telegram runtime validation still pending.

## Context and Orientation

The Telegram provider registers bot commands using the command registry in `src/auto-reply/commands-registry.data.ts`. The `listChannelDocks()` call collects enabled docks (channels), and for each dock with native command capability, a `defineChatCommand` object is created. Telegram only accepts command names containing lowercase letters, digits, and underscores; hyphens cause `BOT_COMMAND_INVALID` during `setMyCommands`.

Run Logs: Not applicable (no run logs captured yet).

## Plan of Work

Edit the dock command registration in `src/auto-reply/commands-registry.data.ts` so the `nativeName` uses underscores instead of hyphens. Leave `textAlias` unchanged to preserve existing user-facing slash commands. After the change, run a focused validation (or start the gateway with Telegram configured) and confirm the log no longer reports `BOT_COMMAND_INVALID`.

## Concrete Steps

From the repo root in the worktree (`/Users/georgepickett/clawdbot-worktrees/issue-901`), edit `src/auto-reply/commands-registry.data.ts`:

    ...
    defineChatCommand({
      key: `dock:${dock.id}`,
      nativeName: `dock_${dock.id}`,
      description: `Switch to ${dock.id} for replies.`,
      textAlias: `/dock-${dock.id}`,
      acceptsArgs: false,
    })
    ...

Then run the gateway with Telegram configured (or a focused test if one exists) and observe that `telegram setMyCommands failed: ... BOT_COMMAND_INVALID` does not appear. Example validation command (if applicable to your setup):

    cd /Users/georgepickett/clawdbot-worktrees/issue-901
    pnpm dev

Also run the test suite to validate the change:

    cd /Users/georgepickett/clawdbot-worktrees/issue-901
    pnpm test

Expected outcome: Telegram command registration succeeds without the `BOT_COMMAND_INVALID` error in logs, and the test suite passes.

## Validation and Acceptance

Acceptance is met when starting the gateway with a Telegram bot configured no longer logs `BOT_COMMAND_INVALID`, and the dock command still appears as `/dock-telegram` in user-facing help or command lists.

## Idempotence and Recovery

The edit is safe to reapply. If the change breaks command registration, revert the single line change to restore the previous behavior.

## Artifacts and Notes

    Change summary:
    - nativeName for dock commands now uses underscores to satisfy Telegram.

    Tests:
    - pnpm test (passes)

    Formatting:
    - pnpm format (check failed, fixed with `pnpm exec oxfmt src/agents/pi-tools.policy.ts src/agents/pi-tools.ts`)

## Interfaces and Dependencies

No new interfaces or dependencies are introduced. The change updates the existing `defineChatCommand` object within `src/auto-reply/commands-registry.data.ts`.

Note: Created initial ExecPlan after implementing the edit to align the plan with the current state and capture the decision rationale.
