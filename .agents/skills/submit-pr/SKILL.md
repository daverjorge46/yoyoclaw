---
name: submit-pr
description: Generate a PR description, push, and create a GitHub PR for a validated fix. Use after implement-fix produces a committed fix on a feature branch.
---

# Submit PR

## Overview

Take a validated, committed fix from `implement-fix` and submit it as a GitHub PR to `openclaw/openclaw`. Covers PR description generation, push, and PR creation.

## Inputs

- Issue number and URL.
- Committed fix on a feature branch (from `implement-fix`).
- Root cause analysis and call chain context (from `implement-fix` Steps 1-2).

## Context: What Merged PR Descriptions Actually Look Like

From analyzing ~30 recently merged external PRs, the descriptions that get merged fast share these traits:

1. **Short, structured, scannable.** Maintainers review 10+ PRs/day. They skim.
2. **Problem → Root Cause → Fix → Tests.** That's the flow. No preamble, no narrative.
3. **Name the exact function and file.** Not "the handler" — say "`onModelChange` in `app-render.ts`".
4. **Before/After is the most useful section.** Maintainers want to see the behavioral delta.
5. **Test plan is concrete.** "2 unit tests in `message.test.ts` — both fail before, pass after" beats "added comprehensive test coverage".
6. **`## Summary` not `#### Summary`.** 97% of merged PRs use `##` headers.
7. **No sign-off section needed for XS/S fixes.** The diff speaks for itself.

### Format Examples from Merged PRs

**mcaxtr (#13474, XS, security, merged same-day):**

```
## Summary
The security audit's attack surface summary reported `hooks: disabled` even when
internal hooks were actively running.

**Root cause:** `collectAttackSurfaceSummaryFindings()` only checked `cfg.hooks?.enabled`
and completely ignored `cfg.hooks?.internal?.enabled`.

**Fix:** Split the single `hooks:` line into two separate lines:
- `hooks.webhooks: disabled/enabled`
- `hooks.internal: disabled/enabled`

### Before / After
...

## Test plan
- [x] 3 new tests, all fail before fix, pass after (TDD)
- [x] All 47 existing tests continue to pass
- [x] `pnpm build && pnpm check` pass
```

**akramcodez (#10352, XS, Telegram, merged same-day):**

```
### Problem
The `/compact` command doesn't appear in Telegram's native command menu.

### Solution
- Added `nativeName: "compact"` to command definition
- Removed `scope: "text"` restriction to allow native registration

### Changes
- `src/auto-reply/commands-registry.data.ts` - Modified compact command config
- `src/auto-reply/commands-registry.test.ts` - Updated test expectations

Fixes #10312
```

**Key observation:** Both styles work. The common thread is brevity, specificity, and naming exact files/functions.

## PR Description Writing Style

Write like a senior dev posting in a team Slack channel — casual but precise. The goal: a maintainer reads your PR and thinks "this person actually debugged this and knows what they're talking about."

### Core Principle: Natural and Professional

Sound like a competent engineer who just fixed a real bug, not a bot generating a report.

- Human dev: "the session entry stores absolute paths but the resolver rejects them after the 2.12 path hardening — added a fallback to basename resolution"
- AI bot: "The `resolveSessionFilePath` function rejects absolute paths stored by `initSessionState` due to the path hardening introduced in version 2026.2.12"
- Too casual: "lol this was broken af, just needed to grab the basename"

The first one is what we want — technically precise, naturally phrased, no fluff.

### Rules

- Be brief. If a section needs more than 3 sentences, you're over-explaining.
- Skip sections that don't apply. Don't write "N/A" — just leave them out.
- Use contractions: "doesn't", "isn't", "won't", "can't".
- Vary sentence length. Mix short punchy lines with longer ones.
- Start some sentences with "So", "Turns out", "Basically", "Looks like".
- Don't narrate your process or debugging journey.
- It's fine to be slightly imprecise — the diff is right there.
- Include a brief technical observation when relevant — "simpler than I expected since the helper already existed", "the streaming path handles this differently so I left it alone".
- Natural phrasing is good: "bails early", "gets swallowed", "the fix is straightforward".
- Don't be perfectly structured — real devs sometimes put key info mid-paragraph, not always under a neat header.
- Slight uncertainty on edge cases is fine and professional: "I think this covers the edge cases but the streaming path might need a separate look" — this reads more credible than "all edge cases are handled."
- Stay technically precise — use correct function names, file paths, and terminology. Casual tone doesn't mean sloppy details.

### Banned Phrases

Never use these — they're LLM fingerprints:

| Category            | Banned                                                                   | Use instead                                              |
| ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| Filler verbs        | "ensure", "utilize", "leverage", "facilitate"                            | "make sure", "use", just drop it                         |
| Adjective padding   | "robust", "comprehensive", "seamless", "streamlined"                     | cut the adjective                                        |
| AI narration        | "silently fails", "silently drops", "silently ignores"                   | "doesn't do anything", "gets skipped", "nothing happens" |
| Process narration   | "upon investigation", "after tracing the call chain", "analysis reveals" | state the finding directly                               |
| Scope hedging       | "this change hardens", "this ensures robustness"                         | say what it actually does                                |
| Connector words     | "furthermore", "additionally", "consequently", "notably"                 | "also", "so", or new sentence                            |
| Formality           | "prior to", "in order to", "with respect to"                             | "before", "to", "about"                                  |
| Completeness claims | "comprehensive test coverage", "thorough validation"                     | just list what you tested                                |
| Auto-summary        | "In summary,", "To summarize,", "Overall,"                               | cut it                                                   |
| Passive structure   | "it was found that", "it should be noted", "it is worth mentioning"      | just say it directly                                     |
| Robot transitions   | "This PR addresses", "This change introduces", "This patch modifies"     | describe the problem/fix without "This PR/change/patch"  |
| Emoji headers       | "🐛", "📊", "🔄", "✅", "❌", "💡", "🔍", "🎯"                           | no emoji in headers or section titles                    |

### Tone Examples

Summary:

- ❌ "When the config has no explicit `agents.list` array (the default for single-agent setups), changing the primary model silently does nothing..."
- ✅ "Save button doesn't enable when you change the model on the Agents overview page. The handler bails early if the agent isn't in `agents.list`, which is the default for single-agent setups."

Root Cause:

- ❌ "The `onModelChange` handler in `app-render.ts` (line 342) checks `agents.list` for the current agent entry. When `agents.list` is undefined..."
- ✅ "`onModelChange` checks `agents.list` for the current agent, but single-agent setups don't populate that array. So it returns early and never marks the form dirty."

## Steps

### Step 1: Generate PR Title

Format: `fix(scope): description (#issue-number)`

**Core principle:** The title is a headline. A maintainer scanning 20 PRs should stop at yours and think "oh that's a real bug, let me look." Describe the symptom the user hits, not the code you changed.

**Rules:**

- Keep it under 60 characters (before the issue number).
- Describe the user-visible pain, not the implementation. The bug report is almost always a better title than the fix description.
- Use punchy, visceral verbs: "stop hanging", "don't lose", "fix crash", "stop dropping", "prevent duplicates". These make the reader feel the impact.
- One problem per title. If you need "and", pick the scarier one.
- Never use: "gracefully degrade", "handle edge case", "improve robustness", "enhance error handling", "ensure", "add exit call", "update logic". These are implementation noise — say what the user sees instead.
- Frame it as the bug, not the fix. "message send hangs forever after delivery" beats "exit after message send completes". The first one makes you want to click; the second one sounds like a chore.

**Writing technique:** Imagine a user filing a bug in one sentence. That sentence is your title. Then trim it to fit.

- User says: "message send hangs forever after it delivers" → `fix(cli): stop message send from hanging forever after delivery`
- User says: "voice messages just disappear when the network blips" → `fix(telegram): stop dropping voice messages on getFile network errors`
- User says: "the save button doesn't work when I change the model" → `fix(agents): save button dead after model change on single-agent setups`

**Good examples:**

- `fix(cli): stop message send from hanging forever after delivery (#16460)` — you feel the pain, you want to fix it
- `fix(telegram): stop dropping voice messages on getFile network errors (#16136)` — "dropping voice messages" is scary, grabs attention
- `fix(agents): save button dead after model change on single-agent setups (#1234)` — "dead" is vivid, scope is clear
- `fix(signal): don't lose messages when bridge reconnects (#9876)` — "lose messages" makes you click

**Bad examples:**

- ❌ `fix(cli): exit after message send completes (#16460)` — describes the code change, not the bug. Boring. Nobody clicks this.
- ❌ `fix(cli): add process.exit(0) to message send path (#16460)` — pure implementation detail, zero urgency
- ❌ `fix(telegram): retry getFile for non-sticker media and gracefully degrade on failure (#16136)` — mechanism-first, two actions, AI-speak
- ❌ `fix(agents): handle edge cases in model selection and improve error handling (#1234)` — vague, two actions, says nothing
- ❌ `fix: ensure robust retry mechanism for network failures (#5678)` — "ensure robust" is AI-speak, no scope

**Self-check:** Read the title out loud as if you're telling a coworker about a bug over coffee. If it sounds like a commit message or a changelog entry, rewrite it. If it sounds like "dude, message send just hangs forever", you're on the right track.

### Step 2: Generate PR Description

Use `##` headers (not `####`). Include `lobster-biscuit` in the body (shows you read the guide).

**For Fix PRs (most common):**

```md
## Summary

<!-- 2-4 sentences. Bug, then fix. Name the function. -->

Closes #[issue-number]

lobster-biscuit

## Root Cause

<!-- 2-3 sentences. Name the function, file, and what's wrong. -->

## Changes

- Before: <!-- one line, concrete behavior -->
- After: <!-- one line, concrete behavior -->

## Tests

<!-- List what you tested. Concrete, not abstract. -->

- `<test-file>` — <what it covers>, fails before fix, passes after
- `pnpm build && pnpm check` pass
```

**Keep it short.** The best merged PRs have 10-20 lines of description, not 50. Skip sections that don't apply — don't write "N/A".

For non-Fix types, same `##` header style:

- Feature: Summary, Use Cases, Changes, Tests
- Refactor: Summary, Scope, "No Behavior Change" statement, Tests
- Security: Summary, Risk Summary, Repro Steps, Fix, Verification, Tests
- Docs: Summary, Pages Updated, Before/After
- Perf: Summary, Baseline, After, Measurement Method, Tests

### Step 3: AI Smell Check (mandatory)

Before submitting, run this self-check. If any answer is "yes", rewrite that section:

1. **Title check:** Is the title over 60 chars (before issue number)? Does it contain "and" joining two actions? Any AI phrases like "gracefully", "robust", "ensure"? → Rewrite.
2. Read the Summary out loud. Does it sound like a template or a Slack message? Template → rewrite.
3. Count sentences starting with "The" or "This" — more than 1 in any section → rephrase.
4. Are all sections roughly the same length? → Make some shorter.
5. Does Root Cause read like a step-by-step trace? → Compress to 2 sentences.
6. Any word from the banned phrases table? → Replace it.
7. Any emoji in headers or section titles? → Remove them.
8. Any deletable adjectives? → Delete them.
9. Uses "does not" / "is not" instead of contractions? → Use contractions.
10. Is the description longer than 30 lines? → Cut it down. Shorter is better.

### Step 4: Push and Create PR

**4a: Verify prerequisites:**

```bash
gh auth status
git branch --show-current
git log --oneline -3
```

Extract fork owner:

```bash
FORK_OWNER=$(gh repo view --json owner --jq '.owner.login' 2>/dev/null || git remote get-url origin | sed -E 's#.+[:/]([^/]+)/[^/]+\.git$#\1#')
BRANCH=$(git branch --show-current)
echo "Will create PR from $FORK_OWNER:$BRANCH"
```

**4b: Write PR body to temp file:**

Write the description to `pr-body.md` in the repo root. Double-check: no AI/model references, no emoji headers.

**4c: Push and create:**

```bash
git push origin HEAD
```

```bash
gh pr create \
  --repo openclaw/openclaw \
  --head "$FORK_OWNER:$BRANCH" \
  --base main \
  --title "<title from Step 1>" \
  --body-file pr-body.md
```

**4d: Cleanup:**

Delete `pr-body.md` immediately. Output the PR URL.

**4e: Follow-up comment (optional, only if genuinely useful):**

Most successful merged PRs have ZERO author comments. The maintainers just merge them. Only add a follow-up comment if you have genuinely new information that isn't in the PR description — like an edge case you noticed after submitting, or a related issue you found.

**Do NOT add a comment just to "signal engagement."** An empty or generic comment is worse than no comment. If you have nothing new to add, skip this step entirely.

If you do comment:

- 1 sentence max. A fragment is fine.
- Must contain new information not in the PR body.
- No "please review" or "let me know if you have questions" — those are bot tells.

```bash
gh pr comment <PR_NUMBER> --repo openclaw/openclaw -b "<your comment>"
```

## Pre-submission Checklist

- PR title format: `fix(scope): description (#issue)`
- PR description contains `lobster-biscuit`
- Correct `##` header format (not `####`)
- No AI/model references in description
- No emoji in headers
- AI smell check passed (9-point checklist)
- No banned phrases
- Uses contractions throughout
- Description is under 30 lines (excluding code blocks)
- Non-applicable sections omitted (no "N/A" filler)
- Issue referenced with `Closes #xxx`
- Diff size is XS or S
- `pnpm build` passes
- `pnpm check` passes
- `pnpm vitest run <directory>` passes
- Root cause names exact function and file
- Reused existing utilities where applicable
- Types strict, no new `any`
- Failing test proves the bug (for fix PRs)
- No unrelated changes bundled
- No secrets, private data, real phone numbers, or personal hostnames
- Searched codebase and GitHub for related issues/PRs/fixes

## Output

- PR URL printed at the end.

## Guardrails

- Do not modify source code in this skill — that's `implement-fix`.
- Delete `pr-body.md` after PR creation.
- Do not mention AI tools in the PR description.
- **Never mention internal skill/workflow names** (`find-issue`, `implement-fix`, `submit-pr`, `review-pr`, `merge-pr`, `prepare-pr`, etc.) in the PR title, description, comments, or any public-facing output. These are internal automation details — exposing them signals bot-generated content and will get the PR rejected.
- If `gh auth status` fails, prompt the user to run `gh auth login`.
- **Do not add a follow-up comment unless you have genuinely new information.**
