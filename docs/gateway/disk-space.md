# Disk Space Management

The OpenClaw gateway automatically monitors disk space and cleans up caches when disk usage exceeds 85%.

## Automatic Cleanup

When the gateway starts, it checks disk space usage. If usage is above 85%, it automatically:

- Cleans npm cache (~10-15GB)
- Cleans Yarn cache (~15-20GB)
- Cleans pnpm store (~5GB)
- Cleans Homebrew cache (macOS, ~1-2GB)
- Cleans OpenClaw browser cache (~50-100MB)
- Removes old session logs (>7 days, or >1 day if disk >95% full)
- Removes old memory snapshots (keeps last 10, or last 3 if disk >95% full)
- Cleans `/data/.openclaw` (Render/persistent volumes)
- Removes large workspace files (>100MB, older than thresholds)

This cleanup runs silently in the background and typically frees **20-35GB** of disk space.

### Aggressive Cleanup

When disk usage exceeds **95%** (critically full), the gateway automatically uses **aggressive cleanup mode**:

- Session logs >1 day old (instead of >7 days)
- Keeps only last 3 memory snapshots (instead of 10)
- Cleans workspace files more aggressively
- Targets `/data` persistent volumes on Render

This mode is designed for space-constrained environments like Render's 1GB persistent disk.

## Configuration

### Disable Automatic Cleanup

To disable automatic disk cleanup, set an environment variable:

```bash
export OPENCLAW_SKIP_DISK_CLEANUP=1
```

Or in your `.profile` / `.bashrc`:

```bash
echo 'export OPENCLAW_SKIP_DISK_CLEANUP=1' >> ~/.profile
```

### Manual Cleanup

To manually clean disk space at any time, use the cleanup script:

```bash
# Run cleanup script (from repo directory)
bash scripts/cleanup-disk-space.sh

# Quick cleanup without browser caches
echo "n" | bash scripts/cleanup-disk-space.sh

# Aggressive cleanup (for critically full disks)
bash scripts/cleanup-disk-space.sh --aggressive
```

The `--aggressive` flag is automatically used by the Render startup script when disk usage exceeds 95%.

## How It Works

The gateway uses the `autoCleanDiskSpace()` function from `src/infra/disk-space.ts`:

1. **Check disk space** - Reads current disk usage via `df` (Unix) or `wmic` (Windows)
2. **Compare threshold** - If usage > 85%, trigger cleanup
3. **Run cleanup commands** - Execute safe cache cleanup commands
4. **Verify results** - Check disk space again and log results

## Threshold

The default threshold is **85%** disk usage. This threshold is hardcoded in `src/gateway/server-startup.ts` and can be adjusted if needed.

## Logs

Disk space check logs appear in the gateway logs:

```
[gateway] disk space: 95% used (25GB available)
[gateway] disk usage above 85% (95%), running cleanup...
[gateway] cleanup complete: 17% used (freed 31GB)
```

## Cross-Platform Support

The disk space utility works on:

- **macOS** - Uses `df -k` for space check, cleans Homebrew + npm/yarn/pnpm caches
- **Linux** - Uses `df -k` for space check, cleans npm/yarn/pnpm caches
- **Windows** - Uses `wmic logicaldisk` for space check, cleans npm/yarn/pnpm caches
- **Render** - Detects `/data` persistent volume and cleans it separately from main filesystem

## Safety

All cleanup operations are **safe**:

- Only removes **cache files** that can be re-downloaded
- Never touches user data, configuration, or session state
- Commands run with error suppression (failures are logged but don't crash the gateway)
- No destructive operations (no `rm -rf /` risks)

## When Cleanup Fails

If cleanup fails or disk space is still critically low:

1. Check logs: `openclaw logs gateway --tail 100`
2. Manually check disk usage: `df -h`
3. Identify large files: `du -sh ~/.openclaw/*`
4. Consider Docker cleanup: `docker system prune -af --volumes`
5. Review system temp files: `~/Library/Caches` (macOS) or `/tmp` (Linux)

## Render Deployment Strategy

Render provides a small 1GB persistent disk at `/data`. This is insufficient for active agent workspaces and session logs, which can easily exceed 1GB during normal operation.

### Architecture

The Render deployment splits storage:

- **Persistent disk (`/data`)**: Only configuration file (`/data/.openclaw/openclaw.json`)
- **Ephemeral storage (main overlay)**: Workspace (`/tmp/openclaw-workspace`) and sessions (`/tmp/openclaw-sessions`)

The main overlay filesystem has ~290GB available vs `/data`'s 1GB. Since workspace and sessions don't need to persist across deployments, they use ephemeral storage.

### Migration

If you have an existing Render deployment with data on `/data`, the startup script automatically:

1. Removes old `/data/workspace` contents
2. Moves `/data/.openclaw/agents` (sessions) to ephemeral storage
3. Creates symlinks so the gateway finds data in the new location

### Emergency Cleanup

If `/data` is full and blocking deployment, SSH to Render and run:

```bash
bash scripts/render-emergency-cleanup.sh
```

This removes all non-essential data from `/data`, leaving only the config file.

## Troubleshooting

### Cleanup doesn't trigger

- Verify disk usage: `df -h`
- Check if disabled: `echo $OPENCLAW_SKIP_DISK_CLEANUP`
- Check gateway logs for errors

### Disk still full after cleanup

- Run aggressive cleanup: `bash scripts/cleanup-disk-space.sh --aggressive`
- Check what's using space: `du -sh /data/* 2>/dev/null | sort -h` (Render) or `du -sh ~/* | sort -hr | head -20`
- Check Docker disk usage: `docker system df`
- On Render: check workspace size `du -sh /data/workspace` and consider cleaning old agent work

### Permission errors during cleanup

- npm/yarn/pnpm caches are user-owned and don't require sudo
- Homebrew cleanup might fail if packages are locked (safe to ignore)
- OpenClaw directories are user-owned and should be writable

## Related Commands

- `openclaw logs gateway` - View gateway logs including disk space check
- `openclaw status` - View gateway status
- `df -h` - Check disk space manually (Unix)
- `du -sh ~/.openclaw/*` - Check OpenClaw directory sizes
