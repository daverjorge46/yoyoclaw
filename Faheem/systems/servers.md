# Servers & VPS

## Server Inventory
| Name | Provider | IP | Specs | OS | Monthly Cost | Purpose |
|------|----------|-----|-------|-----|-------------|---------|
| _[main server]_ | _[provider]_ | _[IP]_ | _[RAM/CPU/Disk]_ | _[Ubuntu/etc]_ | _[DZD/USD]_ | Coolify + deployments |

## Coolify Instance
- **URL:** _[dashboard URL]_
- **Version:** _[version]_
- **Projects deployed:**
  | Project | Domain | Status | Last Deploy |
  |---------|--------|--------|-------------|
  | _[project]_ | _[domain]_ | _[running/stopped]_ | _[date]_ |

## SSH Access
| Server | Host | User | Port | Key Name | Notes |
|--------|------|------|------|----------|-------|
| _[server]_ | _[IP or hostname]_ | _[user]_ | _[22/custom]_ | _[key name]_ | |

## Server Maintenance
- [ ] OS updates: _[last updated]_
- [ ] Disk space check: _[last checked]_
- [ ] SSL certificates: _[auto-renew? expiry dates]_
- [ ] Backup verification: _[last verified]_

## Common Commands
```bash
# SSH into main server
ssh user@IP -p PORT

# Check disk space
df -h

# Check running containers (Coolify)
docker ps

# Restart Coolify
# _[command]_

# Check server load
htop
```

## Incident Log
| Date | Issue | Resolution | Prevention |
|------|-------|-----------|-----------|
| _[date]_ | _[what happened]_ | _[how fixed]_ | _[how to prevent]_ |

## Notes
- Server access details are sensitive — this file is private
- Faheem can check server status during heartbeats if configured
