---
summary: "Exec denylist: block high-risk commands before allowlist evaluation"
read_when:
  - Configuring exec denylist patterns
  - Understanding why a command requires approval despite being allowlisted
  - Hardening agent security for external system actions
title: "Exec Denylist"
---

# Exec denylist

The exec denylist is a **pre-allowlist safety gate** that forces approval for high-risk commands
regardless of allowlist status. It addresses a fundamental gap where allowlisting a binary
(e.g. `git`) also silently allows dangerous subcommands (e.g. `git push --force`).

## How it works

```
Command → Denylist check → Allowlist check → Approval decision
```

1. Before any allowlist evaluation, the command is checked against the denylist.
2. If **any** denylist pattern matches, `ask` is forced to `always` — the user must explicitly
   approve the command even if the binary is allowlisted.
3. The approval prompt includes a warning explaining which denylist pattern triggered.

## Default patterns

The built-in denylist covers common external-system and destructive commands:

| Pattern             | Mode       | Reason          | Description                           |
| ------------------- | ---------- | --------------- | ------------------------------------- |
| `git push`          | subcommand | external-system | Pushes commits to a remote repository |
| `npm publish`       | subcommand | external-system | Publishes to npm registry             |
| `yarn publish`      | subcommand | external-system | Publishes to npm registry             |
| `pnpm publish`      | subcommand | external-system | Publishes to npm registry             |
| `curl -X POST`      | subcommand | external-system | Sends HTTP POST request               |
| `curl -X PUT`       | subcommand | external-system | Sends HTTP PUT request                |
| `curl --data`       | subcommand | external-system | Sends data via HTTP                   |
| `curl -d `          | subcommand | external-system | Sends data via HTTP                   |
| `dropdb`            | binary     | destructive     | Drops a PostgreSQL database           |
| `rm -rf /`          | subcommand | destructive     | Recursively removes root filesystem   |
| `docker push`       | subcommand | external-system | Pushes container image to registry    |
| `docker login`      | subcommand | external-system | Authenticates to container registry   |
| `scp`               | binary     | external-system | Copies files to/from remote host      |
| `ssh`               | binary     | external-system | Opens remote shell session            |
| `wget --post-data`  | subcommand | external-system | Sends data via HTTP POST              |
| `gh pr merge`       | subcommand | external-system | Merges a pull request on GitHub       |
| `gh issue close`    | subcommand | external-system | Closes an issue on GitHub             |
| `kubectl apply`     | subcommand | external-system | Applies config to Kubernetes cluster  |
| `kubectl delete`    | subcommand | destructive     | Deletes Kubernetes resources          |
| `terraform apply`   | subcommand | external-system | Applies infrastructure changes        |
| `terraform destroy` | subcommand | destructive     | Destroys managed infrastructure       |
| `aws s3 rm`         | subcommand | destructive     | Deletes objects from S3               |
| `gcloud`            | binary     | external-system | Google Cloud CLI                      |
| `heroku`            | binary     | external-system | Heroku CLI                            |
| `vercel deploy`     | subcommand | external-system | Deploys to Vercel                     |
| `flyctl deploy`     | subcommand | external-system | Deploys to Fly.io                     |
| `psql -c`           | subcommand | external-system | Executes SQL via psql CLI             |

## User-configurable denylist

You can add custom denylist entries in `~/.openclaw/exec-approvals.json`:

```json
{
  "version": 1,
  "denylist": [
    {
      "pattern": "my-deploy-tool push",
      "mode": "subcommand",
      "reason": "external-system",
      "description": "Pushes to our internal deployment system"
    }
  ]
}
```

User entries are **merged with defaults** (additive only). You cannot remove built-in
patterns — they are constitutional. Duplicate entries (same `mode` + `pattern`) are
automatically deduplicated.

## Match modes

- **subcommand**: Matches binary name + first argument(s). `git push` matches `git push origin main`
  but not `git status`. Binary names are matched by basename, so `/usr/bin/git push` also matches.
- **binary**: Matches the executable name only (any subcommand). `dropdb` matches `dropdb mydb`.
- **regex**: Tests the full command string against a regular expression (case-insensitive).

## What is NOT blocked

Safe read/local operations pass through without denylist interference:

- `git status`, `git log`, `git diff`, `git commit`, `git branch`, `git checkout`
- `npm install`, `npm run build`, `npm test`
- `curl https://example.com` (GET requests)
- `rm -rf ./node_modules` (non-root paths)
- `docker build`, `docker run` (local operations)
- `kubectl get`, `kubectl describe` (read-only operations)

## Chained commands

Denylist evaluation checks every segment of chained commands (`&&`, `||`, `;`) and piped
commands (`|`). If **any** segment matches, the entire command requires approval.

```
git add . && git commit -m "fix" && git push origin main
                                    ^^^^^^^^^^^^^^^^^^^^
                                    ⚠️ Denylist match: git push
```

## Interaction with other policies

- **Denylist fires before allowlist.** Even if `git` is in the allowlist, `git push` still
  requires approval.
- **Denylist does not override `security=deny`.** If security is `deny`, all commands are blocked.
- **Elevated mode with `full` bypasses all approvals** including the denylist. This is by design
  for operator-controlled elevated sessions.
- **Safe bins are unaffected.** `jq`, `grep`, etc. are not in the default denylist.

## Related

- [Exec tool](/tools/exec)
- [Exec approvals](/tools/exec-approvals)
- [Elevated mode](/tools/elevated)
