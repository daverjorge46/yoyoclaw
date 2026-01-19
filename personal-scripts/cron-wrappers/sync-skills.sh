#!/bin/bash
# System cron wrapper for sync-skills
# Schedule: every 4 hours (0 */4 * * *)

SCRIPT="/Users/steve/clawd/personal-scripts/sync-skills.sh"
CLAWDBOT="/Users/steve/Library/pnpm/clawdbot"

# Run the actual script
OUTPUT=$("$SCRIPT" 2>&1) || true

# Send output via clawdbot agent (delivers to telegram)
if [ -n "$OUTPUT" ]; then
    "$CLAWDBOT" agent --agent main --message "$OUTPUT" --deliver --reply-channel telegram --reply-to 1191367022
else
    "$CLAWDBOT" agent --agent main --message "✅ sync-skills completed (no output)" --deliver --reply-channel telegram --reply-to 1191367022
fi
