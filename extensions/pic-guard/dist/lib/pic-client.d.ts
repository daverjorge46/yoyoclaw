/**
 * PIC HTTP Bridge client – fail-closed HTTP client for the PIC verifier.
 *
 * Calls POST /verify on the Python-side bridge and returns a typed response.
 * On ANY failure (timeout, connection refused, malformed response) the client
 * returns { allowed: false } — never throws.
 */
import type { PICVerifyResponse } from "./types.js";
import { PICPluginConfig } from "./types.js";
/**
 * Verify a tool call against the PIC HTTP bridge.
 *
 * @param toolName  - The tool being invoked (e.g. "exec", "write_file").
 * @param toolArgs  - Full tool arguments (should include __pic if the agent provided one).
 * @param config    - Plugin configuration (bridge URL, timeout).
 * @returns           PICVerifyResponse — always resolves, never rejects.
 */
export declare function verifyToolCall(toolName: string, toolArgs: Record<string, unknown>, config?: PICPluginConfig): Promise<PICVerifyResponse>;
