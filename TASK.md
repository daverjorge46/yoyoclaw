# Task: Eagerly start QMD manager on gateway boot

## Issue

QMD (the memory search sidecar) is lazily initialized - it only starts when `memory_search` or `memory_get` is called. After gateway restarts (from config reloads, deploys, manual restart), the in-memory QmdMemoryManager and its setInterval timer are lost. If no memory tool is called after restart, QMD's periodic update/embed cycle never starts again.

## What to implement

### 1. Add eager QMD initialization on gateway startup

In `src/gateway/server.impl.ts`, after config is loaded and sidecars are started (near lines 548-599), add a startup step that:

- Checks if `memory.backend === "qmd"` (or resolves to qmd via `resolveMemoryBackendConfig`)
- If yes, calls `getMemorySearchManager()` for the default agent to arm the periodic timer
- The default agent can be found from `cfg.agents.list` where `default: true`, or fall back to `"main"`

The key insight: `getMemorySearchManager()` already handles caching, fallback creation, and calling `initialize()` which starts the `setInterval` timer. We just need to call it once at boot.

### 2. Key files to read first

- `/tmp/qmd-sidecar-deep-dive.md` - full investigation report with line numbers
- `src/memory/search-manager.ts` - lazy init + caching logic (lines 19-65)
- `src/memory/qmd-manager.ts` - QmdMemoryManager with initialize() and timer (lines 148-157)
- `src/gateway/server.impl.ts` - gateway startup (lines 548-599)
- `src/gateway/server-startup.ts` - startGatewaySidecars() (lines 26-160)

### 3. Implementation approach

The simplest and safest approach:

- Add a function like `startMemoryBackend(cfg)` in `src/gateway/server-startup.ts` (or a new file)
- Call it from `startGatewaySidecars()` or directly from `server.impl.ts` after sidecars start
- It should:
  1. Load config and check `memory.backend`
  2. If "qmd", resolve the default agent id
  3. Call `getMemorySearchManager({ cfg, agentId })`
  4. Log that QMD was initialized (e.g., `[memory/qmd] initialized on boot`)
- Wrap in try/catch so a QMD failure doesn't block gateway startup

### 4. Tests

- Check if there are existing tests for gateway startup or sidecars
- Add a test that verifies: when memory.backend is "qmd", getMemorySearchManager is called during startup
- If testing infrastructure is too complex, at minimum verify `pnpm tsgo` passes

### 5. Verify build

Run `pnpm tsgo` to verify TypeScript compilation passes.

## Constraints

- Don't change QMD's lazy initialization for tool calls - that should still work as before
- This is additive: we're just adding an eager call at boot, not changing the existing lazy path
- Keep it minimal and focused - don't refactor the memory system
- Gateway startup must not fail if QMD init fails (catch and log errors)

When completely finished, run this command to notify me:
openclaw system event --text "Done: QMD eager boot fix implemented" --mode now
