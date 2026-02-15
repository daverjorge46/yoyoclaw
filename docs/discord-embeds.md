# Discord Embeds - Usage Guide

Discord embeds allow you to send rich, structured messages with colors, fields, and formatting.

## Quick Start

### Basic Example

```typescript
import { sendMessageDiscord } from './discord/send.js';
import { createStatusEmbed, EmbedColors } from './discord/embed-templates.js';

// Create a simple status embed
const embed = createStatusEmbed({
  title: "Task Complete",
  description: "Your request has been processed successfully.",
  status: "success",
  fields: [
    { name: "Duration", value: "2.3s", inline: true },
    { name: "Items Processed", value: "42", inline: true }
  ],
  footer: "OpenClaw Assistant"
});

// Send it
await sendMessageDiscord(channelId, "", {
  embeds: [embed]
});
```

## Template Gallery

### 1. Alert/Warning Embed

```typescript
import { createAlertEmbed } from './discord/embed-templates.js';

const embed = createAlertEmbed({
  title: "Large Session Warning",
  message: "Session file has grown to 773KB and may cause timeouts.",
  details: [
    { label: "Session ID", value: "cb11d4bd..." },
    { label: "Size", value: "773KB" }
  ],
  action: "Use `/new` command to start a fresh session"
});
```

**Result:**
```
┌─────────────────────────────────────┐
│ ⚠️ Large Session Warning            │ (Orange box)
│                                     │
│ Session file has grown to 773KB...  │
│                                     │
│ Session ID: cb11d4bd...             │
│ Size: 773KB                         │
│                                     │
│ 📋 Action Required                  │
│ Use `/new` command to start fresh   │
│                                     │
│ 2026-02-15 13:00:00                │
└─────────────────────────────────────┘
```

### 2. System Status Embed

```typescript
import { createSystemStatusEmbed } from './discord/embed-templates.js';

const embed = createSystemStatusEmbed({
  title: "Memory System",
  status: "healthy",
  metrics: [
    { name: "Neurons", value: "90", inline: true },
    { name: "Synapses", value: "219", inline: true },
    { name: "Sessions", value: "43 files", inline: true }
  ]
});
```

**Result:**
```
┌─────────────────────────────────────┐
│ ✅ Memory System                    │ (Green box)
│                                     │
│ Neurons: 90    Synapses: 219       │
│ Sessions: 43 files                  │
│                                     │
│ OpenClaw System Monitor             │
│ 2026-02-15 13:00:00                │
└─────────────────────────────────────┘
```

### 3. Error Embed

```typescript
import { createErrorEmbed } from './discord/embed-templates.js';

const embed = createErrorEmbed({
  title: "API Request Failed",
  error: "ERR_CONNECTION_TIMEOUT",
  context: {
    "Endpoint": "https://api.example.com/data",
    "Timeout": "5000ms"
  }
});
```

### 4. Cron Job Status

```typescript
import { createCronStatusEmbed } from './discord/embed-templates.js';

const embed = createCronStatusEmbed({
  jobs: [
    { name: "Observer", status: "ok", nextRun: "in 12m" },
    { name: "Maintenance", status: "idle", nextRun: "in 15h" }
  ]
});
```

### 5. Memory System Status

```typescript
import { createMemoryStatusEmbed } from './discord/embed-templates.js';

const embed = createMemoryStatusEmbed({
  neurons: 90,
  synapses: 219,
  fibers: 34,
  observations: { lines: 437, size: "26KB" },
  sessions: { count: 43, size: "3.2M" }
});
```

### 6. Success Confirmation

```typescript
import { createSuccessEmbed } from './discord/embed-templates.js';

const embed = createSuccessEmbed({
  title: "Deployment Complete",
  message: "Phase 1 (C-alt) successfully deployed.",
  details: {
    "Duration": "~1 hour",
    "Tests Passed": "9/9",
    "Rating": "11/10"
  }
});
```

## Custom Embeds

### Build Your Own

```typescript
import type { DiscordEmbed } from './discord/embed-templates.js';
import { EmbedColors } from './discord/embed-templates.js';

const customEmbed: DiscordEmbed = {
  title: "My Custom Embed",
  description: "This is a custom embed with all the features",
  color: EmbedColors.INFO,
  fields: [
    { name: "Field 1", value: "Value 1", inline: true },
    { name: "Field 2", value: "Value 2", inline: true },
    { name: "Full Width", value: "This field spans the full width", inline: false }
  ],
  footer: { text: "Custom Footer Text" },
  timestamp: new Date().toISOString(),
  thumbnail: { url: "https://example.com/image.png" }
};
```

### Available Colors

```typescript
import { EmbedColors, DISCORD_BLURPLE } from './discord/embed-templates.js';

EmbedColors.SUCCESS  // 0x00D26A (Green)
EmbedColors.INFO     // 0x5865F2 (Blurple)
EmbedColors.WARNING  // 0xFEE75C (Yellow)
EmbedColors.ERROR    // 0xED4245 (Red)
EmbedColors.NEUTRAL  // 0x99AAB5 (Gray)
DISCORD_BLURPLE      // 0x5865F2 (Discord brand)
```

## Integration with OpenClaw

### In Agent Tool Calls

```typescript
// In your agent tool
import { message } from './tools/message.js';
import { createAlertEmbed } from './discord/embed-templates.js';

// Check session size
const sessionSize = await checkSessionSize();

if (sessionSize > 500 * 1024) {
  const embed = createAlertEmbed({
    title: "Large Session Detected",
    message: `Session has grown to ${formatBytes(sessionSize)}`,
    details: [
      { label: "Size", value: formatBytes(sessionSize) },
      { label: "Threshold", value: "500KB" }
    ],
    action: "Consider using `/new` to start fresh"
  });

  await message({
    action: "send",
    channel: "discord",
    to: channelId,
    message: "",
    embeds: [embed]
  });
}
```

### In Auto-Reply

```typescript
// In reply handler
import { createStatusEmbed } from './discord/embed-templates.js';

const embed = createStatusEmbed({
  title: "Processing Complete",
  description: "Your task has been completed successfully.",
  status: "success"
});

return {
  text: "", // Empty text since embed has content
  embeds: [embed]
};
```

## Limits & Best Practices

### Discord Limits

- **Max embeds per message:** 10
- **Title:** 256 characters
- **Description:** 4096 characters
- **Fields:** 25 fields max
- **Field name:** 256 characters
- **Field value:** 1024 characters
- **Footer text:** 2048 characters
- **Total characters:** 6000 across all embeds

### Best Practices

1. **Use colors meaningfully:**
   - Green = success/healthy
   - Yellow = warning/attention
   - Red = error/critical
   - Blue = info/neutral

2. **Keep it concise:**
   - Short titles (< 50 chars)
   - Brief descriptions (< 200 chars)
   - Use fields for structured data

3. **Inline fields:**
   - Use `inline: true` for related metrics
   - Max 3 inline fields per row
   - Full-width fields for important info

4. **Timestamps:**
   - Always include for time-sensitive info
   - Use ISO 8601 format: `new Date().toISOString()`

5. **Footer:**
   - Use for attribution ("OpenClaw Assistant")
   - Or for additional context

6. **Avoid empty content:**
   - If using embeds, text can be empty
   - But at least one embed should have content

## Examples in Production

### Session Recovery Alert

```typescript
const embed = createSessionWarningEmbed({
  sessionId: "cb11d4bd-7db5-4e8a-a9a9-5d10a584fc34",
  size: "773KB",
  issue: "Session froze for 9 minutes due to size",
  recommendation: "Use `/new` to start a fresh session"
});
```

### Memory System Health Check

```typescript
const status = await getSystemStatus();

const embed = createMemoryStatusEmbed({
  neurons: status.nmem.neurons,
  synapses: status.nmem.synapses,
  fibers: status.nmem.fibers,
  observations: {
    lines: status.observations.lines,
    size: formatBytes(status.observations.size)
  },
  sessions: {
    count: status.sessions.count,
    size: formatBytes(status.sessions.total)
  }
});
```

### Cron Job Monitor

```typescript
const jobs = await getCronStatus();

const embed = createCronStatusEmbed({
  jobs: jobs.map(j => ({
    name: j.name,
    status: j.enabled ? "ok" : "idle",
    nextRun: j.nextRun
  }))
});
```

## Testing

```bash
# Run embed tests
npm test -- embed-templates.test.ts

# Test in Discord
openclaw message send --channel discord \
  --to "YOUR_CHANNEL_ID" \
  --embed-title "Test Embed" \
  --embed-description "Testing embeds!" \
  --embed-color "0x00D26A"
```

## Troubleshooting

### Embed not showing?

1. Check Discord permissions: "Embed Links" must be enabled
2. Verify embed structure (use templates!)
3. Ensure color is a number (hex: `0x5865F2`)
4. Check character limits

### Colors not working?

```typescript
// ❌ Wrong
color: "#5865F2"  // String
color: "0x5865F2" // String

// ✅ Right
color: 0x5865F2   // Number
color: EmbedColors.INFO
```

### Fields not inline?

```typescript
// Inline fields (side by side)
{ name: "CPU", value: "45%", inline: true },
{ name: "RAM", value: "2.3GB", inline: true },

// Full width field
{ name: "Details", value: "Long text...", inline: false }
```

## Further Reading

- [Discord Embed Object Reference](https://discord.com/developers/docs/resources/channel#embed-object)
- [Discord Embed Visualizer](https://leovoel.github.io/embed-visualizer/)
- [OpenClaw Discord Channel Docs](../docs/channels/discord.md)
