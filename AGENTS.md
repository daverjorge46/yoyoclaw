# Repository Guidelines

- Repo: https://github.com/openclaw/openclaw
- GitHub issues/comments/PR comments: use literal multiline strings or `-F - <<'EOF'` (or `$'...'`) for real newlines; never embed `\\n`.

## Core Scope

- Source code: `src/`
- Tests: colocated `*.test.ts`
- Docs: `docs/`
- Extensions: `extensions/*`
- Dist output: `dist/`

When refactoring shared channel logic, always check both core and extension channels:

- Core code: `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, `src/web`, `src/channels`, `src/routing`
- Extension channels: `extensions/*`

## Build, Test, and Development

- Runtime baseline: Node `22+`
- Install deps: `pnpm install`
- Type-check/build: `pnpm build`
- Lint/format/type checks: `pnpm check`
- Tests: `pnpm test`

If commands fail due to missing deps (`node_modules`, missing binaries), run the package-manager install command and retry once.

## Proactive Follow-through

- 做完變更就主動跑後續步驟，不要只留「請再執行 xxx」。
- 程式/邏輯變更預設 gate：`pnpm build && pnpm check && pnpm test`。
- 若驗證失敗，先修再重跑，直到通過或需要使用者決策。

## Coding and Testing Rules

- Language: TypeScript (ESM), prefer strict typing, avoid `any`.
- Add brief comments only for non-obvious logic.
- Keep files concise; refactor helpers instead of duplicating flows.
- Prefer colocated tests and keep behavior changes covered.
- Do not set test workers above 16.
- `docs/zh-CN/**` is generated; do not edit unless explicitly requested.

## Docs Rules

- Docs hosted on Mintlify (`docs.openclaw.ai`).
- Internal docs links in `docs/**/*.md`: root-relative, no `.md`/`.mdx`.
- Keep README links absolute (`https://docs.openclaw.ai/...`).
- Use generic placeholders in docs; never include real personal data.

## Commit and PR Rules

- Use `scripts/committer "<msg>" <file...>` for scoped commits.
- Keep commit messages concise and action-oriented.
- Group related changes only; avoid unrelated refactors in one commit.
- Canonical templates:
  - PR: `.github/pull_request_template.md`
  - Issues: `.github/ISSUE_TEMPLATE/`

## Safety and Guardrails

- Never edit `node_modules`.
- Never update the Carbon dependency.
- Any `pnpm.patchedDependencies` entry must be exact version (no `^`/`~`).
- Do not add/modify dependency patches (pnpm patch/override/vendored) without explicit approval.
- Do not change release versions unless operator explicitly approves.
- Keep secrets/real tokens/real phone numbers out of repo content.

Multi-agent safety:

- Do not use `git stash` unless explicitly requested.
- Do not switch branches unless explicitly requested.
- Do not create/remove/modify git worktrees unless explicitly requested.
- When asked to commit, scope to your changes; when asked to push, you may rebase/pull to integrate upstream.

## Specialized Playbooks (Moved to Skills)

Use these local skills when tasks match; keep AGENTS concise and load details on demand:

- Docker runtime consistency:
  - `.agents/skills/docker-runtime-consistency/SKILL.md`
- Platform ops (exe.dev VM, macOS gateway app ops, Fly signal shortcut, session-log paths, voice wake forwarding):
  - `.agents/skills/platform-ops/SKILL.md`
- Release and publishing (version-file matrix, notary env, npm+1password publish flow):
  - `.agents/skills/release-publish/SKILL.md`

Existing workflow skills:

- `.agents/skills/PR_WORKFLOW.md`
- `.agents/skills/mintlify/SKILL.md`
- `.agents/skills/review-pr/SKILL.md`
- `.agents/skills/prepare-pr/SKILL.md`
- `.agents/skills/merge-pr/SKILL.md`
