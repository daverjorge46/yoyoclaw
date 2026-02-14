---
name: release-publish
description: Release and publishing playbook for version bumps, notary context,
  and npm + 1Password flows. Use for release prep and publish verification tasks.
license: MIT
compatibility: Requires shell tooling for release workflows and npm publishing.
metadata:
  author: openclaw
  version: "1.0"
---

# Release and Publish

Use this skill for release versioning, notarization, and npm publishing.

## Guardrails

- Never bump versions without explicit operator approval.
- Never run publish/release steps without explicit approval.

## Version File Matrix

When asked to bump version everywhere, update all below except `appcast.xml`:

- `package.json`
- `apps/android/app/build.gradle.kts`
- `apps/ios/Sources/Info.plist`
- `apps/macos/Sources/OpenClaw/Resources/Info.plist`
- `docs/install/updating.md`
- `docs/platforms/mac/release.md`
- Peekaboo plists/projects as applicable

## Notary and Signing Context

- Follow internal release docs for signing/notary key handling.
- Expected env vars:
  - `APP_STORE_CONNECT_ISSUER_ID`
  - `APP_STORE_CONNECT_KEY_ID`
  - `APP_STORE_CONNECT_API_KEY_P8`

## npm + 1Password Flow

- Use 1password skill/process.
- Run all `op` commands in a fresh tmux session.

Sign in:

- `eval "$(op signin --account my.1password.com)"`

Get OTP:

- `op read 'op://Private/Npmjs/one-time password?attribute=otp'`

Publish:

- `npm publish --access public --otp="<otp>"`

Verify without polluting local npmrc:

- `npm view <pkg> version --userconfig "$(mktemp)"`

After publish:

- close/kill the tmux session used for 1Password ops.
