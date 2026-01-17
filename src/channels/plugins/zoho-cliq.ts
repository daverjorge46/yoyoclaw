import {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
} from "../../routing/session-key.js";
import type { ChannelMeta } from "./types.js";
import type { ChannelPlugin } from "./types.js";

const meta: ChannelMeta = {
  id: "zoho-cliq",
  label: "Zoho Cliq",
  selectionLabel: "Zoho Cliq (OAuth)",
  docsPath: "/channels/zoho-cliq",
  docsLabel: "zoho-cliq",
  blurb: "supported (OAuth API).",
};

export type ResolvedZohoCliqAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  configured: boolean;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  dc: string;
  allowFrom?: Array<string | number>;
};

export const zohoCliqPlugin: ChannelPlugin<ResolvedZohoCliqAccount> = {
  id: "zoho-cliq",
  meta,
  capabilities: {
    chatTypes: ["direct", "group"],
    media: true,
  },
  config: {
    listAccountIds: (cfg) => {
      const accounts = (cfg as any).channels?.["zoho-cliq"]?.accounts;
      if (!accounts) return [];
      return Object.keys(accounts);
    },
    resolveAccount: (cfg, accountId) => {
      const resolvedAccountId = normalizeAccountId(accountId);
      const accounts = (cfg as any).channels?.["zoho-cliq"]?.accounts;
      if (!accounts) {
        return {
          accountId: resolvedAccountId,
          name: undefined,
          enabled: false,
          configured: false,
          clientId: "",
          clientSecret: "",
          refreshToken: "",
          dc: "",
        };
      }
      const account = accounts[resolvedAccountId];
      if (!account) {
        return {
          accountId: resolvedAccountId,
          name: undefined,
          enabled: false,
          configured: false,
          clientId: "",
          clientSecret: "",
          refreshToken: "",
          dc: "",
        };
      }
      return {
        accountId: resolvedAccountId,
        name: account.name,
        enabled: account.enabled ?? true,
        configured: !!(
          account.clientId &&
          account.clientSecret &&
          account.refreshToken
        ),
        clientId: account.clientId,
        clientSecret: account.clientSecret,
        refreshToken: account.refreshToken,
        dc: account.dc,
        allowFrom: account.allowFrom,
      };
    },
    defaultAccountId: (cfg) => {
      const accounts = (cfg as any).channels?.["zoho-cliq"]?.accounts;
      if (!accounts) return DEFAULT_ACCOUNT_ID;
      const enabled = Object.entries(accounts).filter(
        ([_, a]) => (a as any).enabled ?? true,
      );
      if (enabled.length === 1) return enabled[0][0];
      if (Object.hasOwn(accounts, DEFAULT_ACCOUNT_ID)) {
        return DEFAULT_ACCOUNT_ID;
      }
      return Object.keys(accounts)[0];
    },
    setAccountEnabled: ({ cfg, accountId, enabled }) => {
      const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
      const channels = (cfg as any).channels;
      if (!channels) (cfg as any).channels = {};
      const zoho = channels["zoho-cliq"];
      if (!zoho) return cfg;
      if (!zoho.accounts) zoho.accounts = {};
      const account = zoho.accounts[resolvedAccountId];
      if (account) account.enabled = enabled;
      return cfg;
    },
    deleteAccount: ({ cfg, accountId }) => {
      const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
      const channels = (cfg as any).channels;
      if (!channels) return cfg;
      const zoho = channels["zoho-cliq"];
      if (!zoho) return cfg;
      if (!zoho.accounts) return cfg;
      delete zoho.accounts[resolvedAccountId];
      if (Object.keys(zoho.accounts).length === 0) {
        delete channels["zoho-cliq"];
      }
      return cfg;
    },
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
    }),
    resolveAllowFrom: ({ cfg, accountId }) => {
      const resolvedAccountId = accountId ?? DEFAULT_ACCOUNT_ID;
      const accounts = (cfg as any).channels?.["zoho-cliq"]?.accounts;
      if (!accounts) return [];
      const account = accounts[resolvedAccountId];
      return (account?.allowFrom ?? []).map((entry: any) => String(entry));
    },
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry: any) => String(entry).trim())
        .filter(Boolean)
        .map((entry: any) => entry.toLowerCase()),
  },
  reload: { configPrefixes: ["channels.zoho-cliq"] },
};
