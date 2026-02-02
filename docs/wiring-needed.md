# Wiring Needed

This document tracks UI or workflow elements that are present in the app but not yet wired to real backend behavior.

## Rituals
- **Snooze Next Run**: Action button rendered beside the Next schedule row in the Rituals card. Currently disabled until a snooze endpoint or mutation exists. Files: `apps/web/src/components/domain/rituals/RitualCard.tsx`, `apps/web/src/routes/rituals/index.tsx`.
- **Skip Next Run**: Action button rendered beside the Next schedule row in the Rituals card. Currently disabled until a skip-next endpoint or mutation exists. Files: `apps/web/src/components/domain/rituals/RitualCard.tsx`, `apps/web/src/routes/rituals/index.tsx`.
