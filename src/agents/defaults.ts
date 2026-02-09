// Defaults for agent metadata when upstream does not supply them.
// Model id uses pi-ai's built-in Anthropic catalog.
export const DEFAULT_PROVIDER = "anthropic";
export const DEFAULT_MODEL = "claude-opus-4-6";
// Conservative fallback used when model metadata is unavailable.
// NOTE: Most modern models (Claude 4.5+, Opus 4.6) support 1M context windows.
// See context.ts KNOWN_CONTEXT_OVERRIDES for specific model values.
export const DEFAULT_CONTEXT_TOKENS = 200_000;
