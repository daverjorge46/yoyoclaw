import { createHash } from "node:crypto";
import { LocalReceiptStore } from "./stores/local.js";

export interface ActionReceipt {
  id: string;
  timestamp: string;
  sessionKey: string;
  tier: "low" | "medium" | "high";
  toolName: string;
  argumentsHash: string;
  resultHash: string;
  success: boolean;
  durationMs: number;
  anomalies: string[];
  daCommitment?: string;
}

export interface ReceiptStore {
  put(receipt: ActionReceipt): Promise<void>;
  get(id: string): Promise<ActionReceipt | null>;
  list(opts: { limit: number; offset: number }): Promise<ActionReceipt[]>;
  stats(): Promise<{ total: number; byTier: Record<string, number>; anomalyCount: number }>;
}

export function createReceiptStore(backend?: string): ReceiptStore {
  if (backend === "eigenda") {
    const { EigenDAReceiptStore } = require("./stores/eigenda.js");
    return new EigenDAReceiptStore(process.env.EIGENDA_PROXY_URL!);
  }
  return new LocalReceiptStore();
}

export function hashData(data: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(data ?? ""))
    .digest("hex");
}
