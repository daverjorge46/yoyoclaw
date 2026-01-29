import type { ActionReceipt, ReceiptStore } from "../receipt-store.js";
import { LocalReceiptStore } from "./local.js";

export class EigenDAReceiptStore implements ReceiptStore {
  private proxyUrl: string;
  private localIndex: LocalReceiptStore;

  constructor(proxyUrl: string, dbPath = "boltbot-eigenda-index.db") {
    this.proxyUrl = proxyUrl;
    this.localIndex = new LocalReceiptStore(dbPath);
  }

  async put(receipt: ActionReceipt): Promise<void> {
    const blob = Buffer.from(JSON.stringify(receipt));
    try {
      const res = await fetch(`${this.proxyUrl}/put`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: blob,
      });
      if (res.ok) {
        receipt.daCommitment = Buffer.from(await res.arrayBuffer()).toString("hex");
      }
    } catch {
      // DA failure is non-fatal
    }

    await this.localIndex.put(receipt);
  }

  async get(id: string): Promise<ActionReceipt | null> {
    return this.localIndex.get(id);
  }

  async list(opts: { limit: number; offset: number }): Promise<ActionReceipt[]> {
    return this.localIndex.list(opts);
  }

  async stats() {
    return this.localIndex.stats();
  }
}
