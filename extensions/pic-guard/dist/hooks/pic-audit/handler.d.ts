/**
 * pic-audit — PIC post-execution audit trail for OpenClaw.
 *
 * Hook: tool_result_persist (priority 200)
 *
 * Fires after a tool call completes. Logs a structured audit record
 * capturing the PIC governance outcome. This provides an audit trail
 * for compliance and debugging.
 *
 * This hook is read-only — it never modifies the tool result or blocks
 * execution. It runs at priority 200 (after all functional hooks).
 *
 * LIMITATION: The pic-gate hook strips __pic from params BEFORE execution.
 * Whether __pic is visible here depends on OpenClaw's event propagation.
 * If pic_present shows false for a tool that was gated, it means OpenClaw
 * passed the modified (stripped) params to the persist event.
 */
/** Shape of the tool_result_persist event. */
interface ToolResultEvent {
    toolName: string;
    params: Record<string, unknown>;
    result: unknown;
    error?: string;
    durationMs?: number;
}
/**
 * tool_result_persist handler.
 *
 * @param event - tool execution result event
 * @param ctx   - OpenClaw hook context
 */
export default function handler(event: ToolResultEvent, ctx: Record<string, unknown>): void;
export {};
