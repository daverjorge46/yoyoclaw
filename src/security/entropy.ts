/**
 * High-entropy string detection for secret/credential identification.
 * Uses Shannon entropy calculation combined with regex pattern matching.
 */

export type SecretType =
	| 'api_key'
	| 'bearer_token'
	| 'jwt'
	| 'private_key'
	| 'password'
	| 'generic_secret';

export type DetectedSecret = {
	value: string;
	type: SecretType;
	start: number;
	end: number;
	entropy: number;
	confidence: 'high' | 'medium' | 'low';
	pattern?: string;
};

export type EntropyCheckResult = {
	hasSecrets: boolean;
	secrets: DetectedSecret[];
};

// API key patterns from src/logging/redact.ts + additional patterns
const SECRET_PATTERNS: Array<{ regex: RegExp; type: SecretType; name: string }> = [
	// OpenAI
	{ regex: /sk-proj-[A-Za-z0-9_-]{48,}/g, type: 'api_key', name: 'OpenAI API key' },
	{ regex: /sk-[A-Za-z0-9]{48}/g, type: 'api_key', name: 'OpenAI API key (legacy)' },
	// Anthropic
	{ regex: /sk-ant-[A-Za-z0-9_-]{95,}/g, type: 'api_key', name: 'Anthropic API key' },
	// Google
	{ regex: /AIza[0-9A-Za-z_-]{35}/g, type: 'api_key', name: 'Google API key' },
	// AWS
	{ regex: /AKIA[0-9A-Z]{16}/g, type: 'api_key', name: 'AWS Access Key ID' },
	{
		regex: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/g,
		type: 'api_key',
		name: 'AWS Secret Access Key',
	},
	// GitHub
	{ regex: /ghp_[A-Za-z0-9]{36}/g, type: 'api_key', name: 'GitHub Personal Access Token' },
	{ regex: /gho_[A-Za-z0-9]{36}/g, type: 'api_key', name: 'GitHub OAuth Token' },
	{ regex: /ghs_[A-Za-z0-9]{36}/g, type: 'api_key', name: 'GitHub Server Token' },
	{ regex: /ghr_[A-Za-z0-9]{36}/g, type: 'api_key', name: 'GitHub Refresh Token' },
	// Slack
	{ regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g, type: 'api_key', name: 'Slack Token' },
	// Stripe
	{
		regex: /sk_live_[0-9a-zA-Z]{24,}/g,
		type: 'api_key',
		name: 'Stripe Live Secret Key',
	},
	{
		regex: /rk_live_[0-9a-zA-Z]{24,}/g,
		type: 'api_key',
		name: 'Stripe Live Restricted Key',
	},
	// Twilio
	{ regex: /SK[0-9a-fA-F]{32}/g, type: 'api_key', name: 'Twilio API Key' },
	// SendGrid
	{ regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, type: 'api_key', name: 'SendGrid API Key' },
	// Mailgun
	{ regex: /key-[0-9a-zA-Z]{32}/g, type: 'api_key', name: 'Mailgun API Key' },
	// Bearer tokens
	{ regex: /Bearer\s+[A-Za-z0-9_-]{32,}/gi, type: 'bearer_token', name: 'Bearer Token' },
	// JWT (basic pattern)
	{
		regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
		type: 'jwt',
		name: 'JWT Token',
	},
	// Private keys
	{
		regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
		type: 'private_key',
		name: 'Private Key',
	},
];

// Whitelisted patterns that should NOT be flagged as secrets
const WHITELIST_PATTERNS = [
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUIDs
	/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i, // Base64 images
	/^https?:\/\//i, // URLs
	/^[0-9]{10,}$/, // Pure numeric sequences (timestamps, IDs)
];

/**
 * Calculate Shannon entropy for a string.
 * Higher entropy indicates more randomness (typical of secrets).
 */
function calculateShannonEntropy(str: string): number {
	if (str.length === 0) return 0;

	const frequencies = new Map<string, number>();
	for (const char of str) {
		frequencies.set(char, (frequencies.get(char) || 0) + 1);
	}

	let entropy = 0;
	for (const count of frequencies.values()) {
		const p = count / str.length;
		entropy -= p * Math.log2(p);
	}

	return entropy;
}

/**
 * Check if a string matches any whitelist pattern.
 */
function isWhitelisted(str: string): boolean {
	return WHITELIST_PATTERNS.some((pattern) => pattern.test(str));
}

/**
 * Extract alphanumeric tokens from text for entropy analysis.
 * Focuses on continuous sequences likely to be secrets.
 */
function extractTokens(text: string, minLength: number): Array<{ value: string; start: number }> {
	const tokens: Array<{ value: string; start: number }> = [];
	// Match sequences of alphanumeric chars, hyphens, underscores (common in API keys)
	// Use a shorter minimum for the regex, we'll filter by minLength after
	const tokenRegex = /[A-Za-z0-9_-]+/g;
	let match: RegExpExecArray | null;

	while ((match = tokenRegex.exec(text)) !== null) {
		if (match[0].length >= minLength && !isWhitelisted(match[0])) {
			tokens.push({ value: match[0], start: match.index });
		}
	}

	return tokens;
}

/**
 * Determine confidence level based on entropy and pattern match.
 */
function getConfidence(entropy: number, hasPatternMatch: boolean): 'high' | 'medium' | 'low' {
	if (hasPatternMatch && entropy > 4.5) return 'high';
	if (hasPatternMatch || entropy > 5.0) return 'medium';
	return 'low';
}

// Generic patterns for common secret formats (lower priority than specific patterns)
const GENERIC_SECRET_PATTERNS: Array<{ regex: RegExp; type: SecretType; name: string }> = [
	{
		regex: /[a-z_]+_?secret[_:]?\s*[=:]\s*['"]?[A-Za-z0-9_-]{16,}['"]?/gi,
		type: 'generic_secret',
		name: 'Generic Secret Assignment',
	},
	{
		regex: /[a-z_]+_?key[_:]?\s*[=:]\s*['"]?[A-Za-z0-9_-]{16,}['"]?/gi,
		type: 'generic_secret',
		name: 'Generic Key Assignment',
	},
	{
		regex: /[a-z_]+_?token[_:]?\s*[=:]\s*['"]?[A-Za-z0-9_-]{16,}['"]?/gi,
		type: 'generic_secret',
		name: 'Generic Token Assignment',
	},
];

/**
 * Detect high-entropy strings in a message that may be secrets.
 *
 * @param text - The message text to analyze
 * @param minEntropyThreshold - Minimum Shannon entropy to flag (default: 4.5)
 * @param minLength - Minimum string length to analyze (default: 24)
 * @param customPatterns - Additional regex patterns to check
 * @returns EntropyCheckResult with detected secrets
 */
export function detectHighEntropyStrings(
	text: string,
	options: {
		minEntropyThreshold?: number;
		minLength?: number;
		customPatterns?: string[];
	} = {},
): EntropyCheckResult {
	const { minEntropyThreshold = 4.5, minLength = 24, customPatterns = [] } = options;

	const secrets: DetectedSecret[] = [];
	const detectedRanges = new Set<string>(); // Track ranges to avoid duplicates

	// First pass: specific pattern-based detection (high priority)
	const allPatterns = [...SECRET_PATTERNS];

	// Add custom patterns
	for (const customPattern of customPatterns) {
		try {
			allPatterns.push({
				regex: new RegExp(customPattern, 'g'),
				type: 'generic_secret',
				name: 'Custom Pattern',
			});
		} catch {
			// Invalid regex, skip
		}
	}

	for (const { regex, type, name } of allPatterns) {
		let match: RegExpExecArray | null;
		regex.lastIndex = 0; // Reset regex state

		while ((match = regex.exec(text)) !== null) {
			const value = match[0];
			const start = match.index;
			const end = start + value.length;
			const rangeKey = `${start}-${end}`;

			if (detectedRanges.has(rangeKey) || isWhitelisted(value)) {
				continue;
			}

			const entropy = calculateShannonEntropy(value);
			secrets.push({
				value,
				type,
				start,
				end,
				entropy,
				confidence: getConfidence(entropy, true),
				pattern: name,
			});
			detectedRanges.add(rangeKey);
		}
	}

	// Second pass: generic patterns (medium priority)
	for (const { regex, type, name } of GENERIC_SECRET_PATTERNS) {
		let match: RegExpExecArray | null;
		regex.lastIndex = 0; // Reset regex state

		while ((match = regex.exec(text)) !== null) {
			const value = match[0];
			const start = match.index;
			const end = start + value.length;
			const rangeKey = `${start}-${end}`;

			if (detectedRanges.has(rangeKey) || isWhitelisted(value)) {
				continue;
			}

			const entropy = calculateShannonEntropy(value);
			secrets.push({
				value,
				type,
				start,
				end,
				entropy,
				confidence: getConfidence(entropy, true),
				pattern: name,
			});
			detectedRanges.add(rangeKey);
		}
	}

	// Third pass: entropy-based detection for tokens not caught by patterns
	const tokens = extractTokens(text, minLength);
	for (const { value, start } of tokens) {
		const end = start + value.length;
		const rangeKey = `${start}-${end}`;

		if (detectedRanges.has(rangeKey)) {
			continue; // Already detected by pattern
		}

		const entropy = calculateShannonEntropy(value);
		if (entropy >= minEntropyThreshold) {
			secrets.push({
				value,
				type: 'generic_secret',
				start,
				end,
				entropy,
				confidence: getConfidence(entropy, false),
			});
			detectedRanges.add(rangeKey);
		}
	}

	// Sort by position in text
	secrets.sort((a, b) => a.start - b.start);

	return {
		hasSecrets: secrets.length > 0,
		secrets,
	};
}

/**
 * Redact detected secrets from text, replacing with a placeholder.
 *
 * @param text - Original text
 * @param secrets - Detected secrets to redact
 * @param placeholder - Replacement text (default: "[REDACTED]")
 * @returns Redacted text
 */
export function redactSecrets(
	text: string,
	secrets: DetectedSecret[],
	placeholder = '[REDACTED]',
): string {
	if (secrets.length === 0) return text;

	// Sort by position (descending) to replace from end to start
	const sorted = [...secrets].sort((a, b) => b.start - a.start);

	let result = text;
	for (const secret of sorted) {
		result = result.slice(0, secret.start) + placeholder + result.slice(secret.end);
	}

	return result;
}

