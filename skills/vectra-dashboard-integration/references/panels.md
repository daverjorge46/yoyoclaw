# Panel Contracts for OpenClaw + Vectra Dashboard

## 1) Vectra Chat Panel

Minimum contract:

- Active session id/key
- Last message preview
- Message timestamp
- Send status (idle/sending/error)

Acceptance:

- Can render current conversation context.
- Shows explicit failure state when backend unavailable.

## 2) Nodes Overview Panel

Minimum contract:

- Node name/id
- Online/offline state
- Last heartbeat/time seen
- Current task or phase (if available)

Acceptance:

- Distinguishes healthy vs degraded/offline nodes.
- Refreshes without full dashboard reload.

## 3) Repositories Preview Panel

Minimum contract:

- Repo name/path
- Branch
- Dirty/clean indicator
- Ahead/behind (if available)
- Last commit summary + relative time

Acceptance:

- User can see which repos need attention at a glance.
- Dirty state and branch info are visible without extra clicks.

## Suggested Incremental Sequence

1. Render static panel shells and loading states.
2. Wire repository preview from local git metadata.
3. Wire nodes overview from Vectra/OpenClaw node status.
4. Wire chat preview from active session stream.
5. Add error + retry UX for each panel.
