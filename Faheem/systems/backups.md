# Backups

## What's Backed Up
| What | Where | Frequency | Last Backup | Auto? | Notes |
|------|-------|-----------|-------------|-------|-------|
| Faheem workspace | _[git repo?]_ | On change | _[date]_ | _[yes/no]_ | This workspace |
| Supabase DB | _[method]_ | _[frequency]_ | _[date]_ | _[yes/no]_ | |
| Coolify config | _[method]_ | _[frequency]_ | _[date]_ | _[yes/no]_ | |
| Code repos | GitHub | On push | — | Yes | Git is the backup |
| Personal files | _[where]_ | _[frequency]_ | _[date]_ | _[yes/no]_ | |

## What's NOT Backed Up (Fix These)
- _[Identify gaps]_

## Backup Verification
| What | Last Verified | Method | Result |
|------|-------------|--------|--------|
| _[backup]_ | _[date]_ | _[how you tested restore]_ | _[pass/fail]_ |

## Disaster Recovery Plan
If everything goes down:
1. _[First priority — what to restore first]_
2. _[Second priority]_
3. _[Third priority]_

## Backup Commands
```bash
# Backup Supabase
# _[command or process]_

# Backup Coolify
# _[command or process]_

# Backup workspace to git
cd ~/.openclaw/workspace && git add -A && git commit -m "backup" && git push
```

## Notes
- A backup that hasn't been tested is not a backup
- Faheem can remind about backup verification monthly
- Code on GitHub is safe. Everything else needs a plan.
