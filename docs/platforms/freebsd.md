---
title: FreeBSD
description: Running FreeClaw on FreeBSD
---

# FreeBSD

FreeClaw is purpose-built for FreeBSD. It uses native FreeBSD tooling throughout:

- **Service management**: rc.d scripts via `service(8)` and `sysrc(8)`
- **Process introspection**: `procstat(1)` and `ps(1)` (no /proc dependency)
- **Port inspection**: `sockstat(1)` (not lsof)
- **Daemon management**: `daemon(8)` for background processes
- **PID files**: `/var/run/freeclaw_gateway.pid`
- **Logs**: `/var/log/freeclaw_gateway.log`

## Prerequisites

Install Node.js 22+ and npm via pkg:

```sh
pkg install node22 npm-node22
```

## Install FreeClaw

```sh
npm install -g freeclaw
```

## Quick Start

```sh
freeclaw onboard
```

This walks through initial configuration and optionally installs the gateway as an rc.d service.

## Gateway Service

### Install as rc.d service

```sh
freeclaw gateway install
```

This creates `/usr/local/etc/rc.d/freeclaw_gateway` and enables it via `sysrc`.

### Manual service management

```sh
# Start
service freeclaw_gateway start

# Stop
service freeclaw_gateway stop

# Restart
service freeclaw_gateway restart

# Status
service freeclaw_gateway status
```

### Enable at boot

The installer runs this automatically, but you can also do it manually:

```sh
sysrc freeclaw_gateway_enable=YES
```

### Configuration

The rc.d service supports these rc.conf variables:

```sh
freeclaw_gateway_enable="YES"        # Enable the service
freeclaw_gateway_user="root"         # User to run as
freeclaw_gateway_pidfile="/var/run/freeclaw_gateway.pid"
freeclaw_gateway_logfile="/var/log/freeclaw_gateway.log"
```

## Running in a Jail

FreeClaw runs well inside FreeBSD jails. For jail environments:

1. Ensure the jail has network access
2. Install Node.js inside the jail: `pkg install node22`
3. Run the gateway in the foreground if rc.d is not available:

```sh
freeclaw gateway run --bind loopback --port 18789
```

## Paths

| Path | Purpose |
|------|---------|
| `~/.freeclaw/` | State directory (config, sessions, caches) |
| `~/.freeclaw/freeclaw.json` | Configuration file |
| `/usr/local/etc/rc.d/freeclaw_gateway` | rc.d service script |
| `/var/run/freeclaw_gateway.pid` | PID file |
| `/var/log/freeclaw_gateway.log` | Service log |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `FREECLAW_STATE_DIR` | Override state directory |
| `FREECLAW_CONFIG_PATH` | Override config file path |
| `FREECLAW_GATEWAY_PORT` | Override gateway port (default: 18789) |
| `FREECLAW_PROFILE` | Named profile for multiple instances |
| `FREECLAW_RCD_SERVICE` | Override rc.d service name |

## Troubleshooting

### Check service status

```sh
service freeclaw_gateway status
sockstat -4 -l -p 18789
```

### View logs

```sh
tail -f /var/log/freeclaw_gateway.log
```

### Run diagnostics

```sh
freeclaw doctor
```
