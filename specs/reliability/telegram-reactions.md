# Telegram Reactions Reliability Spec

## Purpose

Ensure Telegram reaction attempts do not emit noisy `REACTION_INVALID` errors and that reply delivery is logged so we can verify the end-to-end flow.

## Preconditions

- Telegram channel configured and connected.
- `channels.telegram.reactionLevel` set to at least `minimal` (or `actions.reactions` enabled if using tools).
- Gateway running with logs visible (e.g., `tail -f data/.pm2/logs/openclaw-gateway-dev-out.log`).

## Steps

1. Send a Telegram message to the bot (DM or group where the bot can respond).
2. Observe that the bot replies (normal response flow).
3. Trigger a reaction action (agent tool or CLI) with a valid emoji on the message.
4. Trigger a reaction action with an invalid emoji (or in a chat where reactions are disabled) to validate graceful handling.

## Expected Logs

- A reply confirmation log appears:
  - `telegram reply delivered chat=<id> replyTo=<id|none> thread=<id|none>`
- No `REACTION_INVALID` errors appear in the gateway logs.
- Reaction success logs appear when valid:
  - `telegram reaction added <emoji> chat=<id> message=<id>`

## Failure Signals

- Any `REACTION_INVALID` errors in logs.
- Missing `telegram reply delivered ...` log line after a reply was sent.
