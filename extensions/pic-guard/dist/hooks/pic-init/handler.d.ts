/**
 * pic-init — PIC awareness injection for OpenClaw.
 *
 * Hook: before_agent_start (priority 50)
 *
 * Pushes a system-level message into the session that informs the agent
 * about PIC governance requirements, so it includes __pic proposals in
 * high-impact tool calls.
 *
 * Also performs an early health check against the PIC bridge to surface
 * connectivity issues at session start rather than at first tool call.
 */
/**
 * before_agent_start handler.
 *
 * @param event - { messages: string[] } — push strings to inject context
 * @param ctx   - OpenClaw hook context
 */
export default function handler(event: {
    messages: string[];
}, ctx: Record<string, unknown>): Promise<void>;
