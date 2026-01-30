/**
 * Security-related configuration types.
 */

export type SecretDetectionConfig = {
	/** Enable high-entropy string detection. Default: true. */
	enabled?: boolean;
	/** Minimum Shannon entropy threshold for flagging secrets. Default: 4.5. */
	minEntropyThreshold?: number;
	/** Minimum string length to analyze for entropy. Default: 24. */
	minLength?: number;
	/** Additional custom regex patterns to detect as secrets. */
	customPatterns?: string[];
};

export type SecretHandlingConfig = {
	/** Enable interactive prompts when secrets are detected. Default: true. */
	interactive?: boolean;
	/** Default action when interactive mode is disabled or times out. Default: "redact". */
	defaultAction?: 'redact' | 'block' | 'allow';
	/** Timeout for interactive confirmation prompts in milliseconds. Default: 15000. */
	confirmationTimeoutMs?: number;
};

export type SecretHandlingFullConfig = {
	/** Secret detection settings. */
	detection?: SecretDetectionConfig;
	/** Secret handling behavior. */
	handling?: SecretHandlingConfig;
};

export type SecurityConfig = {
	/** Secret/credential handling configuration. */
	secrets?: SecretHandlingFullConfig;
	/** Constitutional principles that override user messages (optional). */
	constitution?: string[];
};
