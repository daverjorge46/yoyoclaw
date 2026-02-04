/**
 * Gateway handlers for provider auth configuration.
 */

import type { GatewayRequestHandlers } from "./types.js";
import { upsertAuthProfile } from "../../agents/auth-profiles/profiles.js";
import { ensureAuthProfileStore } from "../../agents/auth-profiles/store.js";
import { normalizeProviderId } from "../../agents/model-selection.js";
import { getProviderById, PROVIDER_REGISTRY } from "../../commands/providers/registry.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

export const authHandlers: GatewayRequestHandlers = {
  /**
   * Set an API key or token for a provider.
   * Saves the credential to the auth profile store and triggers model discovery.
   */
  "auth.setKey": async ({ params, respond, context }) => {
    const provider = typeof params.provider === "string" ? params.provider.trim() : "";
    const credential = typeof params.credential === "string" ? params.credential.trim() : "";
    const credentialType =
      typeof params.credentialType === "string" ? params.credentialType : "api_key";

    if (!provider) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing provider"));
      return;
    }
    if (!credential) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "missing credential"));
      return;
    }
    if (credentialType !== "api_key" && credentialType !== "token") {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `unsupported credentialType: ${credentialType}`),
      );
      return;
    }

    const providerDef = getProviderById(provider);
    if (!providerDef) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `unknown provider: ${provider}`),
      );
      return;
    }

    // Strip surrounding quotes if present
    const cleanCredential = credential.replace(/^["']|["']$/g, "");
    const normalizedId = normalizeProviderId(providerDef.id);
    const profileId = `${normalizedId}:default`;

    try {
      if (credentialType === "api_key") {
        upsertAuthProfile({
          profileId,
          credential: {
            type: "api_key",
            provider: normalizedId,
            key: cleanCredential,
          },
        });
      } else {
        upsertAuthProfile({
          profileId,
          credential: {
            type: "token",
            provider: normalizedId,
            token: cleanCredential,
          },
        });
      }

      // Refresh model catalog so newly configured providers are discovered
      try {
        await context.loadGatewayModelCatalog();
      } catch {
        // Non-fatal: credential is saved even if model discovery fails
      }

      respond(true, { ok: true, profileId });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },

  /**
   * List all known providers with their auth modes and configuration status.
   */
  "auth.listProviders": ({ respond }) => {
    try {
      const store = ensureAuthProfileStore();
      const profileProviders = new Set<string>();
      for (const cred of Object.values(store.profiles)) {
        profileProviders.add(normalizeProviderId(cred.provider));
      }

      const providers = PROVIDER_REGISTRY.map((def) => {
        const normalizedId = normalizeProviderId(def.id);
        return {
          id: def.id,
          name: def.name,
          authModes: def.authModes,
          configured: profileProviders.has(normalizedId),
          envVars: def.envVars,
          isLocal: def.isLocal ?? false,
        };
      });

      respond(true, { providers });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
