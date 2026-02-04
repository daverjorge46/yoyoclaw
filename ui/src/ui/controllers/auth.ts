import type { ProvidersHealthHost } from "./providers-health.ts";
import { loadProvidersHealth } from "./providers-health.ts";

export type AuthProviderEntry = {
  id: string;
  name: string;
  authModes: string[];
  configured: boolean;
  envVars: string[];
  isLocal: boolean;
};

export type AuthHost = ProvidersHealthHost & {
  authConfigProvider: string | null;
  authConfigSaving: boolean;
  authProvidersList: AuthProviderEntry[] | null;
  showToast: (type: "success" | "error" | "info" | "warn", message: string) => void;
};

export async function loadProvidersList(host: AuthHost): Promise<void> {
  if (!host.client || !host.connected) {
    return;
  }
  try {
    const result = await host.client.request("auth.listProviders", {});
    const data = result as { providers?: AuthProviderEntry[] } | undefined;
    host.authProvidersList = data?.providers ?? null;
  } catch {
    // Non-fatal: providers list is supplementary
  }
}

export async function setProviderCredential(
  host: AuthHost,
  provider: string,
  credential: string,
  credentialType: "api_key" | "token",
): Promise<boolean> {
  if (!host.client || !host.connected) {
    return false;
  }
  host.authConfigSaving = true;
  try {
    await host.client.request("auth.setKey", {
      provider,
      credential,
      credentialType,
    });
    host.showToast("success", `Credentials saved for ${provider}.`);
    host.authConfigProvider = null;

    // Refresh providers health + auth list
    await Promise.all([loadProvidersHealth(host), loadProvidersList(host)]);
    return true;
  } catch (err) {
    host.showToast("error", `Failed to save credentials: ${String(err)}`);
    return false;
  } finally {
    host.authConfigSaving = false;
  }
}
