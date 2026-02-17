---
summary: "CLI reference for `yoyoclaw reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `yoyoclaw reset`

Reset local config/state (keeps the CLI installed).

```bash
yoyoclaw reset
yoyoclaw reset --dry-run
yoyoclaw reset --scope config+creds+sessions --yes --non-interactive
```
