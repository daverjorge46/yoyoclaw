import { loadConfig } from "../config/config.js";
import { ZohoCliqBot } from "./bot.js";
import type { ZohoCliqConfig } from "../config/types.js";

export async function sendMessageZohoCliq(
  channelIdOrChatId: string,
  text: string,
  opts?: { accountId?: string; mediaUrl?: string },
) {
  const cfg = loadConfig();
  const accountId = opts?.accountId ?? "main";
  const zohoConfig = cfg.channels?.["zoho-cliq"] as ZohoCliqConfig | undefined;
  const accountCfg = zohoConfig?.accounts?.[accountId];

  if (!accountCfg) {
    throw new Error(`Zoho Cliq account ${accountId} not found in config`);
  }

  const bot = new ZohoCliqBot(accountCfg);
  return await bot.sendMessage(channelIdOrChatId, text);
}
