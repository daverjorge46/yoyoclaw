import type * as Lark from "@larksuiteoapi/node-sdk";
import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import { Type } from "@sinclair/typebox";
import type { ResolvedFeishuAccount } from "./types.js";
import { resolveFeishuAccount, listEnabledFeishuAccounts } from "./accounts.js";
import { createFeishuClient } from "./client.js";

/**
 * Optional account parameter for Feishu tool schemas.
 * When provided, the tool uses the specified account's credentials
 * instead of the default account.
 */
export const AccountParam = Type.Optional(
  Type.String({
    description:
      "Feishu account ID to use (matches keys in channels.feishu.accounts). " +
      "Omit to use the default account.",
  }),
);

/**
 * Create a function that resolves a Feishu client based on an optional account ID.
 * If accountId is provided, uses that account's credentials.
 * Otherwise falls back to the default (first) account.
 */
export function createAccountAwareClientResolver(
  cfg: ClawdbotConfig,
  defaultAccount: ResolvedFeishuAccount,
): (accountId?: string) => Lark.Client {
  return (accountId?: string) => {
    if (accountId) {
      const accounts = listEnabledFeishuAccounts(cfg);
      const match = accounts.find((a) => a.accountId === accountId);
      if (match) {
        return createFeishuClient(match);
      }
      // Try resolving even if not in the enabled list (user might know what they're doing)
      const resolved = resolveFeishuAccount({ cfg, accountId });
      if (resolved.configured) {
        return createFeishuClient(resolved);
      }
      // Fall through to default if account not found
    }
    return createFeishuClient(defaultAccount);
  };
}
