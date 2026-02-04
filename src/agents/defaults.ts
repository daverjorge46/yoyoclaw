// Defaults for agent metadata when upstream does not supply them.
// Model id uses pi-ai's built-in Anthropic catalog.

// Check if AWS Bedrock credentials are available
function hasBedrockAuth(): boolean {
  const env = process.env;
  // Check for AWS bearer token
  if (env.AWS_BEARER_TOKEN_BEDROCK?.trim()) {
    return true;
  }
  // Check for AWS access key + secret
  if (env.AWS_ACCESS_KEY_ID?.trim() && env.AWS_SECRET_ACCESS_KEY?.trim()) {
    return true;
  }
  // Check for AWS profile
  if (env.AWS_PROFILE?.trim()) {
    return true;
  }
  return false;
}

// Prefer Bedrock models when AWS credentials are available
const useBedrockDefaults = hasBedrockAuth();

export const DEFAULT_PROVIDER = useBedrockDefaults ? "bedrock" : "anthropic";
export const DEFAULT_MODEL = useBedrockDefaults
  ? "bedrock/us.anthropic.claude-sonnet-4-20250514-v1:0"
  : "claude-opus-4-5";
// Context window: Both Opus 4.5 and Bedrock Sonnet 4 support ~200k tokens.
export const DEFAULT_CONTEXT_TOKENS = 200_000;
