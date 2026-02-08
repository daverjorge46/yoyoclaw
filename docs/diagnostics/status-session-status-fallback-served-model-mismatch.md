# Bug Note: `/status` and `session_status` can report configured model instead of served model after fallback

## Problem
When fallback occurs, `/status` and `session_status` can continue to show the configured/override model value, even though a different model actually served the response.

## Impact
- Misleading operational visibility during outages/fallbacks.
- Confusing debugging when output/cost/latency match fallback model behavior but status claims another model.
- Incorrect assumptions about model-specific behavior and guarantees.

## Reproduction evidence (verified)
1. Configure or override model **A**.
2. Cause/observe routing fallback where request is served by model **B**.
3. Confirm response/provider path indicates **B** served.
4. Run `/status` or inspect `session_status`.
5. Reported model can remain **A** instead of **B**.

## Proposed fix direction
- Persist a distinct `servedModel` (effective model) from the final response path.
- Keep `configuredModel`/override as separate metadata.
- Update `/status` and `session_status` to prioritize `servedModel` when present.
- Ensure fallback updates are atomic with response finalization to avoid stale status.

## Acceptance criteria
- [ ] After fallback, `/status` shows the actual served model.
- [ ] `session_status` shows the same actual served model.
- [ ] Configured/override model, if displayed, is clearly labeled separately.
- [ ] Tests cover no-fallback and fallback scenarios (including override+fallback).
- [ ] No regression in non-fallback reporting.

