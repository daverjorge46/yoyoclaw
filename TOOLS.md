# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## SSH Hosts

### synology
- **IP**: 192.168.4.84
- **User**: dbhurley
- **Port**: 22
- **Services**: Plex, Radarr, Sonarr, SABnzbd, Home Assistant
- **Use**: `ssh synology`

### mac-mini (Steve's Brain) ✅ ONLINE
- **IP**: 192.168.7.86
- **Hostname**: steve.local
- **User**: steve
- **Password**: BendDontBreak!
- **Specs**: Mac mini M4 Pro, 14 cores, 64GB RAM, 926GB SSD
- **macOS**: 26.1 (Sequoia)
- **Services**: Future "brain" - will host migrated services
- **Git Repo**: /users/steve/git
- **Use**: `ssh mac-mini` or `ssh steve@192.168.7.86`

## Smart Home

### Hue Bridge
- **IP**: 192.168.4.95
- **Status**: Connection issues as of Jan 4, 2026
- **Rooms**: Master Suite (need to map lights)

## Media Server (Synology)

- **Plex**: http://192.168.4.84:32400
- **Radarr**: http://192.168.4.84:7878
- **Sonarr**: http://192.168.4.84:8989
- **SABnzbd**: http://192.168.4.84:8080

## Package Managers

**Use pnpm for global packages** (it's first in PATH):
```bash
pnpm add -g <package>    # ✅ correct
npm install -g <package>  # ❌ goes to wrong location
```

Global bins: `/Users/dbhurley/Library/pnpm/`

## Twitter/X

### Steve's Account (@Steve_Hurley_)
- **Script:** `scripts/steve-tweet.sh` (uses my own cookies)
- **Usage:** `scripts/steve-tweet.sh <command> [args]`
- **Examples:**
  - `scripts/steve-tweet.sh whoami` — verify auth
  - `scripts/steve-tweet.sh tweet "Hello!"` — post a tweet
  - `scripts/steve-tweet.sh read <url>` — read a tweet
- **Config:** Credentials in `~/.clawdbot/clawdbot.json` under `skills.entries.bird`

### David's Account (default `bird` command)
- Uses browser cookies automatically
- Just run `bird <command>` for David's account

---

Add whatever helps you do your job. This is your cheat sheet.
