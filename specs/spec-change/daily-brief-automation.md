# Daily Brief Automation Spec

## Background

The `morning-todo-brief` cron job provides a consolidated view of tasks and emails.
Reliability has been low due to missing configuration.

## Status (2026-02-14)

- **Current State**: Active.
- **Error**: None (Fixed).
- **Accomplished**:
  - Found `TICKTICK_ID` and `TICKTICK_SECRET` in environment.
  - Successfully generated `TICKTICK_ACCESS_TOKEN` via OAuth flow.
  - Verified `morning-todo-brief` (TickTick source) access via Python script.
- **Blocker**: None for TickTick. (Gmail/Outline still need keys but TickTick is verified).

## Next Steps

- **Main Agent**: Schedule `morning-todo-brief` to run daily.
- **User**: Provide `MATON_API_KEY` (Gmail) and `OUTLINE_TOKEN` (Outline) for full brief coverage.

## Verification Queue

- [x] VQ-001: Run `morning-todo-brief` successfully (exit code 0, content generated).
