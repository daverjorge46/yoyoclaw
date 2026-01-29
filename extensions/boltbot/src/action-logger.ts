import { randomUUID } from "node:crypto";
import { getTier } from "./action-tiers.js";
import type { AfterToolCallEvent } from "./anomaly.js";
import { detectAnomalies } from "./anomaly.js";
import type { ActionReceipt, ReceiptStore } from "./receipt-store.js";
import { hashData } from "./receipt-store.js";

type ToolContext = {
  agentId?: string;
  sessionKey?: string;
  toolName: string;
};

export function createActionLogger(store: ReceiptStore) {
  return async function afterToolCall(
    event: AfterToolCallEvent,
    ctx: ToolContext,
  ): Promise<void> {
    const tier = getTier(event.toolName);
    if (tier === "low") return;

    const receipt: ActionReceipt = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      sessionKey: ctx.sessionKey ?? "unknown",
      tier,
      toolName: event.toolName,
      argumentsHash: hashData(event.params),
      resultHash: hashData(event.result ?? event.error),
      success: !event.error,
      durationMs: event.durationMs ?? 0,
      anomalies: detectAnomalies(event),
    };

    store.put(receipt).catch(() => {});
  };
}
