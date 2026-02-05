# Context Limit Enforcement — Per-Model vs Global Clamp
**Version:** v1.0
**Date:** 2026-02-05
**Purpose:** Document where per-model context limits override global MINIMUM_CONTEXT_TOKENS clamp

---

## Critical Rule

**MINIMUM_CONTEXT_TOKENS clamp applies ONLY to local providers (Ollama), NOT to cloud providers (Moonshot, Anthropic, OpenAI, etc.).**

---

## Implementation Location

**File:** `src/agents/ollama/context/token-estimator.ts`
**Function:** `createTokenEstimator()`
**Lines:** 68-79

```typescript
export function createTokenEstimator(config: TokenEstimatorConfig = {}): TokenEstimator {
  const multiplier = config.multiplier ?? SAFETY_MARGIN;
  const reserveTokens = config.reserveTokens ?? 2000;
  const requestedContextTokens = config.maxContextTokens ?? DEFAULT_CONTEXT_TOKENS;
  const maxContextTokens = Math.max(requestedContextTokens, MINIMUM_CONTEXT_TOKENS);

  // Warn once per unique requested value when clamping occurs
  if (requestedContextTokens < MINIMUM_CONTEXT_TOKENS) {
    if (!clampedContextWarnings.has(requestedContextTokens)) {
      clampedContextWarnings.add(requestedContextTokens);
      console.warn(
        `[ollama-context] maxContextTokens clamped: requested=${requestedContextTokens}, clamped=${maxContextTokens}, minimum=${MINIMUM_CONTEXT_TOKENS}`,
      );
    }
  }

  const maxPromptTokens = maxContextTokens - reserveTokens;

  return {
    estimate: (text: string) => Math.ceil(estimateStringTokens(text) * multiplier),
    maxPromptTokens,
    maxContextTokens,
    reserveTokens,
    multiplier,
  };
}
```

---

## Constants

**File:** `src/agents/defaults.ts`

```typescript
// Default context window for models without explicit configuration
export const DEFAULT_CONTEXT_TOKENS = 32768;

// Minimum context window required for embedded agent to function
// This is enforced ONLY for local Ollama providers
export const MINIMUM_CONTEXT_TOKENS = 16000;
```

---

## How It Works

1. **Ollama-specific enforcement:** The clamp is applied inside `token-estimator.ts`, which is used ONLY by Ollama context management (see file path: `src/agents/ollama/context/`).

2. **Cloud providers bypass clamp:** Moonshot, Anthropic, OpenAI, and other cloud providers do NOT use this token estimator. They use their declared `contextWindow` from `models.json` or provider config without any minimum clamp.

3. **Why:** Local models (Ollama) must satisfy a 16k minimum for embedded agent functionality. Cloud models have their own context limits and should not be artificially clamped.

---

## Moonshot Provider Context Limits

**File:** `src/agents/models-config.providers.ts`
**Lines:** 33-42

```typescript
const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
const MOONSHOT_DEFAULT_MODEL_ID = "kimi-k2.5";
const MOONSHOT_DEFAULT_CONTEXT_WINDOW = 256000;  // 256k tokens - NO CLAMP APPLIED
const MOONSHOT_DEFAULT_MAX_TOKENS = 8192;
const MOONSHOT_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};
```

---

## Contract Compliance

This implementation satisfies:
- **Contract §1.5:** "Local providers only: MINIMUM_CONTEXT_TOKENS clamp applies to local providers. Clamp must not apply to Moonshot."
- **Test US-KIMI-03:** "OverBudget test must respect 128k/32k window without global clamp interference."

---

## Testing

To verify:
1. Ollama models below 16k context are clamped → warning logged
2. Moonshot models use declared context window (128k/256k) without clamp → no warning
3. OverBudget errors occur BEFORE HTTP call when context is exceeded

---

**END OF DOCUMENTATION**
