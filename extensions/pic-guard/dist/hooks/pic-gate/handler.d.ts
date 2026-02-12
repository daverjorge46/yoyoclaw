/**
 * pic-gate — PIC Standard pre-execution gate for OpenClaw.
 *
 * Hook: before_tool_call (priority 100)
 *
 * Sends the tool call (including any __pic proposal in params) to the PIC
 * HTTP bridge for verification.
 *
 * - allowed  → strips __pic from params, tool proceeds
 * - blocked  → returns { block: true, blockReason } — NEVER throws
 * - bridge unreachable → blocked (fail-closed)
 */
/**
 * before_tool_call handler.
 *
 * @param event - { toolName: string, params: Record<string, unknown> }
 * @param ctx   - OpenClaw hook context (includes pluginConfig if set)
 *
 * @returns { block, blockReason } on denial; { params } on approval.
 */
export default function handler(event: {
    toolName: string;
    params: Record<string, unknown>;
}, ctx: Record<string, unknown>): Promise<{
    block: true;
    blockReason: string;
} | {
    params: Record<string, unknown>;
} | void>;
