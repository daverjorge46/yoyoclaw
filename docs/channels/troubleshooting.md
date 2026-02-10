---
summary: "Fast channel level troubleshooting with per channel failure signatures and fixes"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Channel Troubleshooting"
---

# Channel troubleshooting

Use this page when a channel connects but behavior is wrong.

## Command ladder

Run these in order first:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Healthy baseline:

- `Runtime: running`
- `RPC probe: ok`
- Channel probe shows connected/ready

## WhatsApp

### WhatsApp failure signatures

| Symptom                         | Fastest check                                       | Fix                                                     |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Connected but no DM replies     | `openclaw pairing list whatsapp`                    | Approve sender or switch DM policy/allowlist.           |
| Group messages ignored          | Check `requireMention` + mention patterns in config | Mention the bot or relax mention policy for that group. |
| Random disconnect/relogin loops | `openclaw channels status --probe` + logs           | Re-login and verify credentials directory is healthy.   |

Full troubleshooting: [/channels/whatsapp#troubleshooting-quick](/channels/whatsapp#troubleshooting-quick)

## Telegram

### Telegram failure signatures

| Symptom                           | Fastest check                                   | Fix                                                       |
| --------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| `/start` but no usable reply flow | `openclaw pairing list telegram`                | Approve pairing or change DM policy.                      |
| Bot online but group stays silent | Verify mention requirement and bot privacy mode | Disable privacy mode for group visibility or mention bot. |
| Send failures with network errors | Inspect logs for Telegram API call failures     | Fix DNS/IPv6/proxy routing to `api.telegram.org`.         |
| DMs silently ignored (dmPolicy)   | Check `channels.telegram.dmPolicy` in config    | Ensure not set to `"disabled"`; check verbose logs.       |
| Bot polls but messages vanish     | `openclaw logs --follow` + send a test DM       | Check DM policy + allowFrom; see note below.              |
| 409 conflict on getUpdates        | Check for multiple processes or bot instances    | Kill duplicate gateway processes; use one token per bot.  |

**Note — messages polled but not processed:** When the gateway consumes messages from
Telegram (blocking manual `getUpdates` calls with 409) but nothing reaches the agent,
the most common causes are:

1. **DM policy filtering** — `dmPolicy: "pairing"` (default) silently queues unapproved
   senders. Run `openclaw pairing list telegram` to check. Switch to `"allowlist"` with
   explicit `allowFrom` entries if you want immediate access.
2. **Stale update offset** — The gateway persists the last processed update ID. If the
   offset file (`~/.openclaw/state/telegram/update-offset-*.json`) contains an ID higher
   than current updates, new messages are skipped. Delete the file and restart.
3. **allowFrom mismatch** — When using `dmPolicy: "allowlist"`, ensure `allowFrom`
   contains either the numeric user ID (recommended) or `@username`. Numeric IDs are
   more reliable as usernames can change.

Full troubleshooting: [/channels/telegram#troubleshooting](/channels/telegram#troubleshooting)

## Discord

### Discord failure signatures

| Symptom                         | Fastest check                       | Fix                                                       |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| Bot online but no guild replies | `openclaw channels status --probe`  | Allow guild/channel and verify message content intent.    |
| Group messages ignored          | Check logs for mention gating drops | Mention bot or set guild/channel `requireMention: false`. |
| DM replies missing              | `openclaw pairing list discord`     | Approve DM pairing or adjust DM policy.                   |

Full troubleshooting: [/channels/discord#troubleshooting](/channels/discord#troubleshooting)

## Slack

### Slack failure signatures

| Symptom                                | Fastest check                             | Fix                                               |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Socket mode connected but no responses | `openclaw channels status --probe`        | Verify app token + bot token and required scopes. |
| DMs blocked                            | `openclaw pairing list slack`             | Approve pairing or relax DM policy.               |
| Channel message ignored                | Check `groupPolicy` and channel allowlist | Allow the channel or switch policy to `open`.     |

Full troubleshooting: [/channels/slack#troubleshooting](/channels/slack#troubleshooting)

## iMessage and BlueBubbles

### iMessage and BlueBubbles failure signatures

| Symptom                          | Fastest check                                                           | Fix                                                   |
| -------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| No inbound events                | Verify webhook/server reachability and app permissions                  | Fix webhook URL or BlueBubbles server state.          |
| Can send but no receive on macOS | Check macOS privacy permissions for Messages automation                 | Re-grant TCC permissions and restart channel process. |
| DM sender blocked                | `openclaw pairing list imessage` or `openclaw pairing list bluebubbles` | Approve pairing or update allowlist.                  |

Full troubleshooting:

- [/channels/imessage#troubleshooting-macos-privacy-and-security-tcc](/channels/imessage#troubleshooting-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#troubleshooting](/channels/bluebubbles#troubleshooting)

## Signal

### Signal failure signatures

| Symptom                         | Fastest check                              | Fix                                                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Daemon reachable but bot silent | `openclaw channels status --probe`         | Verify `signal-cli` daemon URL/account and receive mode. |
| DM blocked                      | `openclaw pairing list signal`             | Approve sender or adjust DM policy.                      |
| Group replies do not trigger    | Check group allowlist and mention patterns | Add sender/group or loosen gating.                       |

Full troubleshooting: [/channels/signal#troubleshooting](/channels/signal#troubleshooting)

## Matrix

### Matrix failure signatures

| Symptom                             | Fastest check                                | Fix                                             |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| Logged in but ignores room messages | `openclaw channels status --probe`           | Check `groupPolicy` and room allowlist.         |
| DMs do not process                  | `openclaw pairing list matrix`               | Approve sender or adjust DM policy.             |
| Encrypted rooms fail                | Verify crypto module and encryption settings | Enable encryption support and rejoin/sync room. |

Full troubleshooting: [/channels/matrix#troubleshooting](/channels/matrix#troubleshooting)
