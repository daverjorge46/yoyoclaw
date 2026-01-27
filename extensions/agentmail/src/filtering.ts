import type { AgentMailClient } from "agentmail";

import type { AgentMailConfig } from "./utils.js";

/** Checks if a sender email matches any entry in a list (exact email or domain). */
export function matchesList(senderEmail: string, list: string[]): boolean {
  if (!list?.length) return false;
  const sender = senderEmail.toLowerCase().trim();
  const domain = sender.split("@")[1];
  return list.some((e) => {
    const entry = e.toLowerCase().trim();
    return entry === sender || entry === domain;
  });
}

/** Checks if sender is allowed: empty allowFrom = open mode (all allowed). */
export function checkSenderAllowed(
  senderEmail: string,
  config: Pick<AgentMailConfig, "allowFrom">
): boolean {
  const { allowFrom = [] } = config;
  return allowFrom.length === 0 || matchesList(senderEmail, allowFrom);
}

/**
 * Labels a message as "allowed" via the AgentMail API.
 */
export async function labelMessageAllowed(
  client: AgentMailClient,
  inboxId: string,
  messageId: string
): Promise<void> {
  await client.inboxes.messages.update(inboxId, messageId, {
    addLabels: ["allowed"],
  });
}
