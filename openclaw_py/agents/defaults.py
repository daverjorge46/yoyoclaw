"""Default agent configuration values.

This module defines default provider, model, and context window settings.
"""

# Default provider when none specified
DEFAULT_PROVIDER = "anthropic"

# Default model when none specified
DEFAULT_MODEL = "claude-sonnet-4-5"

# Conservative fallback context window (200k tokens)
DEFAULT_CONTEXT_TOKENS = 200_000

# Default max output tokens
DEFAULT_MAX_TOKENS = 4096

# Default temperature (0.0 - 2.0, typically 0.0 - 1.0)
DEFAULT_TEMPERATURE = 1.0

# Default timeout for API calls (seconds)
DEFAULT_TIMEOUT = 120

# Default max retries
DEFAULT_MAX_RETRIES = 2
