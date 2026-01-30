/**
 * Security event logging infrastructure.
 * Structured logging for security incidents with optional audit trail.
 */

// Lazy import to avoid issues in test environments
let logger: any = null;
function getLogger() {
	if (!logger) {
		try {
			const { createSubsystemLogger } = require('../logging/subsystem.js');
			logger = createSubsystemLogger('security:events');
		} catch {
			// Fallback to console if logging module not available
			logger = {
				info: console.log,
				warn: console.warn,
				error: console.error,
			};
		}
	}
	return logger;
}

export type SecurityEventType =
	| 'prompt_injection_detected'
	| 'high_entropy_detected'
	| 'secret_redacted'
	| 'secret_allowed_by_user'
	| 'secret_detection_disabled'
	| 'interactive_prompt_timeout'
	| 'interactive_prompt_cancelled';

export type SecurityEvent = {
	type: SecurityEventType;
	timestamp: string;
	channel?: string;
	senderId?: string;
	details: Record<string, unknown>;
};

/**
 * Log a security event.
 *
 * @param type - Event type
 * @param details - Event-specific details
 * @param context - Optional context (channel, senderId)
 */
export function logSecurityEvent(
	type: SecurityEventType,
	details: Record<string, unknown>,
	context?: {
		channel?: string;
		senderId?: string;
	},
): void {
	const event: SecurityEvent = {
		type,
		timestamp: new Date().toISOString(),
		channel: context?.channel,
		senderId: context?.senderId,
		details,
	};

	// Log to subsystem logger
	getLogger().info(`Security event: ${type}`, event);

	// Future: Optional audit trail file
	// if (auditTrailEnabled) {
	//   appendToAuditLog(event);
	// }
}

/**
 * Log high-entropy string detection.
 */
export function logHighEntropyDetected(
	secretCount: number,
	secretTypes: string[],
	context?: { channel?: string; senderId?: string },
): void {
	logSecurityEvent(
		'high_entropy_detected',
		{
			secretCount,
			secretTypes: [...new Set(secretTypes)], // Deduplicate
		},
		context,
	);
}

/**
 * Log secret redaction.
 */
export function logSecretRedacted(
	secretCount: number,
	action: 'auto' | 'user_requested',
	context?: { channel?: string; senderId?: string },
): void {
	logSecurityEvent(
		'secret_redacted',
		{
			secretCount,
			action,
		},
		context,
	);
}

/**
 * Log user allowing a secret to pass through.
 */
export function logSecretAllowedByUser(
	secretCount: number,
	context?: { channel?: string; senderId?: string },
): void {
	logSecurityEvent(
		'secret_allowed_by_user',
		{
			secretCount,
		},
		context,
	);
}

/**
 * Log interactive prompt timeout.
 */
export function logInteractivePromptTimeout(
	defaultAction: string,
	context?: { channel?: string; senderId?: string },
): void {
	logSecurityEvent(
		'interactive_prompt_timeout',
		{
			defaultAction,
		},
		context,
	);
}

/**
 * Log interactive prompt cancellation.
 */
export function logInteractivePromptCancelled(
	context?: { channel?: string; senderId?: string },
): void {
	logSecurityEvent('interactive_prompt_cancelled', {}, context);
}
