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
import { DEFAULT_CONFIG } from "../../lib/types.js";
/**
 * Load plugin config from the OpenClaw plugin context.
 */
function loadConfig(ctx) {
    const pluginCfg = (ctx?.pluginConfig ?? {});
    return {
        bridge_url: pluginCfg.bridge_url ?? DEFAULT_CONFIG.bridge_url,
        bridge_timeout_ms: pluginCfg.bridge_timeout_ms ?? DEFAULT_CONFIG.bridge_timeout_ms,
        log_level: pluginCfg.log_level ?? DEFAULT_CONFIG.log_level,
    };
}
/**
 * tool_result_persist handler.
 *
 * @param event - tool execution result event
 * @param ctx   - OpenClaw hook context
 */
export default function handler(event, ctx) {
    const config = loadConfig(ctx);
    // ── Extract PIC metadata (if present in original params) ───────────
    // Note: pic-gate strips __pic before execution. Whether this event
    // receives original or modified params depends on OpenClaw's pipeline.
    const pic = event.params?.__pic;
    const entry = {
        timestamp: new Date().toISOString(),
        event: "tool_result_persist",
        tool: event.toolName,
        pic_in_params: pic !== undefined,
        tool_error: event.error !== undefined,
        duration_ms: event.durationMs,
    };
    // ── Enrich with PIC details when available ─────────────────────────
    if (pic) {
        entry.pic_intent = pic.intent;
        entry.pic_impact = pic.impact;
        // Get trust from first provenance entry (primary source)
        entry.pic_trust_level = pic.provenance?.[0]?.trust;
    }
    // ── Log ────────────────────────────────────────────────────────────
    if (config.log_level === "debug") {
        console.debug(`[pic-audit] ${JSON.stringify(entry)}`);
    }
    else if (config.log_level === "info") {
        console.log(`[pic-audit] tool=${entry.tool} pic_in_params=${entry.pic_in_params} ` +
            `error=${entry.tool_error} duration_ms=${entry.duration_ms ?? "n/a"}`);
    }
}
