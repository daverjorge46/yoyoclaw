# Docker Enhancements & Migration Fixes

This document details the technical improvements made to the `moltbot` Docker environment to resolve migration loops, permission errors, and usability issues.

## 1. The Problem

*   **Migration Loop**: The core logic tried to rename `.clawdbot` to `.moltbot`. In Docker, these are often bind mounts from the host. Renaming a mount point fails with `EBUSY`, causing the container to crash and restart in a loop.
*   **Permission Denied (EACCES)**: The container runs as a non-root user (`node`). If the host directories or Docker volumes were created by `root` (common during initial start), the app crashes when trying to write to `cron`, `canvas`, or `logs`.
*   **Usability**: The `moltbot` CLI was not in the global `PATH` inside the container, requiring confusing commands like `node dist/index.js`.

## 2. Technical Solution

We implemented an **"Atomized"** architecture where the container's state and workspace are fully isolated from the host filesystem using Docker named volumes, ensuring consistent permissions and behavior.

### A. Robust Migration Logic
**File**: `src/infra/state-migrations.ts`

We patched the migration logic to gracefully handle the `EBUSY` error code. If the application encounters a legacy directory that it cannot rename (e.g., a bind mount), it now logs a warning and **skips** the migration instead of crashing.

```typescript
try {
  fs.renameSync(legacyDir, targetDir);
} catch (err: any) {
  if (err.code === "EBUSY") {
    // Log warning and skip migration
    return { migrated: false, skipped: true, ... };
  }
  throw err;
}
```

### B. Atomized & Isolated Storage
**File**: `docker-compose.yml`

We replaced host bind mounts (which leak host permissions and state) with Docker **Named Volumes**. This guarantees the container manages its own state isolated from the host OS quirks.

```yaml
services:
  moltbot-gateway:
    volumes:
      - moltbot_data:/var/lib/moltbot      # Isolated State
      - moltbot_workspace:/home/node/clawd # Isolated Workspace
```

### C. Permission Fixes
**File**: `Dockerfile`

We added an explicit build step to create the volume mount points and assign ownership to the `node` user *before* the container starts.

```dockerfile
# Ensure state directories exist and are owned by node
RUN mkdir -p /var/lib/moltbot /home/node/clawd && \
    chown -R node:node /var/lib/moltbot /home/node/clawd

USER node
```

### D. Developer Experience (DX)
**File**: `Dockerfile` & `docker-compose.yml`

1.  **Container Name**: Set `container_name: moltbot` for easy reference.
2.  **Global CLI**: Added a symlink `/usr/local/bin/moltbot` -> `/app/moltbot.mjs`.
3.  **Explicit Entrypoint**: Hardcoded `node /app/moltbot.mjs` to ensure the correct executable is always run.
4.  **Zero-Config Start**: Added `--allow-unconfigured` to let the gateway start fresh without manual setup.

## 3. Usage

With these changes, the workflow is:

```bash
# Start the container (detached)
docker compose up -d

# Interactions (now intuitive)
docker exec -it moltbot moltbot status
docker exec -it moltbot moltbot onboard
```
