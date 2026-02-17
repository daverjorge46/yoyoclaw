---
summary: "Uninstall YoyoClaw completely (CLI, service, state, workspace)"
read_when:
  - You want to remove YoyoClaw from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `yoyoclaw` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
yoyoclaw uninstall
```

Non-interactive (automation / npx):

```bash
yoyoclaw uninstall --all --yes --non-interactive
npx -y yoyoclaw uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
yoyoclaw gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
yoyoclaw gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.yoyoclaw}"
```

If you set `OPENCLAW_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.yoyoclaw/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g yoyoclaw
pnpm remove -g yoyoclaw
bun remove -g yoyoclaw
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/YoyoClaw.app
```

Notes:

- If you used profiles (`--profile` / `OPENCLAW_PROFILE`), repeat step 3 for each state dir (defaults are `~/.yoyoclaw-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `yoyoclaw` is missing.

### macOS (launchd)

Default label is `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.yoyoclaw.*` may still exist):

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

If you used a profile, replace the label and plist name with `bot.molt.<profile>`. Remove any legacy `com.yoyoclaw.*` plists if present.

### Linux (systemd user unit)

Default unit name is `yoyoclaw-gateway.service` (or `yoyoclaw-gateway-<profile>.service`):

```bash
systemctl --user disable --now yoyoclaw-gateway.service
rm -f ~/.config/systemd/user/yoyoclaw-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `YoyoClaw Gateway` (or `YoyoClaw Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "YoyoClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.yoyoclaw\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.yoyoclaw-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://openclaw.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g yoyoclaw@latest`.
Remove it with `npm rm -g yoyoclaw` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `yoyoclaw ...` / `bun run yoyoclaw ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
