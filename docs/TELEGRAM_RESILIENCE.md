# Telegram Resilience

Utilities for handling Telegram API failures, retries, and recovery.

## Usage

```typescript
import { BotHealthCheck } from "./health.js";
import { retryWithBackoff } from "../infra/retry.js";
import { Circuit } from "./circuit.js";

const health = new BotHealthCheck(bot, logger, {
  interval: 30000,
  onFail: () => console.log("bot offline"),
  onRecover: () => console.log("bot back online"),
});
health.start();

const result = await retryWithBackoff(() => bot.api.sendMessage(chatId, text), {
  attempts: 3,
  minDelayMs: 1000,
});

const circuit = new Circuit(logger, { failures: 5 });
await circuit.exec(() => bot.api.getMe());
```

## Components

**BotHealthCheck**: Monitors connection health
**Circuit**: Prevents cascading failures
**retryWithBackoff**: Uses existing `infra/retry.js` utility for retry logic
