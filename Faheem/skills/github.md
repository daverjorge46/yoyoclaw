# GitHub — Repos & Workflows

## Account
- **Username:** _[to be filled]_
- **Profile:** _[URL]_

## Active Repos
| Repo | URL | Project | Status | Visibility |
|------|-----|---------|--------|-----------|
| _[repo name]_ | _[URL]_ | _[linked project]_ | _[active/archived]_ | _[public/private]_ |

## Branch Convention
- `main` — production
- `dev` — development
- `feature/xxx` — feature branches
- `fix/xxx` — bug fixes

## Commit Message Convention
```
type: short description

[optional body]
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Common Commands
```bash
# Create and switch to new branch
git checkout -b feature/name

# Push new branch
git push -u origin feature/name

# Sync with main
git fetch origin && git rebase origin/main

# Quick commit
git add -A && git commit -m "feat: description"

# Amend last commit (before push)
git commit --amend
```

## GitHub Actions (if using)
- _[List any CI/CD workflows]_

## Notes
- Keep repos organized — archive what's not active
- README every project, even MVPs
- Private repos for client work, public for open source
