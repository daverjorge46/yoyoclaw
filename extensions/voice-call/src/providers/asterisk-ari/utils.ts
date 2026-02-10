import crypto from "node:crypto";
import type { NormalizedEvent } from "../../types.js";

export function nowMs(): number {
  return Date.now();
}

export function buildEndpoint(to: string, trunk?: string): string {
  if (to.includes("/")) {
    return to;
  }
  const t = trunk?.trim();
  return t ? `PJSIP/${t}/${to}` : `PJSIP/${to}`;
}

// NOTE: Omit<Union, K> does NOT preserve per-variant fields because keyof(Union)
// only includes keys common to all members. Use a distributive conditional.
export type NormalizedEventInput = NormalizedEvent extends any
  ? Omit<NormalizedEvent, "id" | "timestamp">
  : never;

export function makeEvent(partial: NormalizedEventInput): NormalizedEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: nowMs(),
    ...partial,
  } as NormalizedEvent;
}
