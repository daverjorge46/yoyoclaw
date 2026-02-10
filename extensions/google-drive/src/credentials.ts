import type { OpenClawConfig } from "openclaw/plugin-sdk";
// Dynamic imports for auth-profiles (not in plugin SDK, need src/dist fallback)
let resolveApiKeyForProfile: typeof import("../../src/agents/auth-profiles/oauth.js").resolveApiKeyForProfile;
let ensureAuthProfileStore: typeof import("../../src/agents/auth-profiles/store.js").ensureAuthProfileStore;
type OAuthCredentials = import("../../src/agents/auth-profiles/types.js").OAuthCredentials;

// Load auth-profiles modules with src/dist fallback
async function loadAuthProfileModules() {
  if (resolveApiKeyForProfile && ensureAuthProfileStore) {
    return;
  }
  // Try src first (dev/test)
  try {
    const oauthMod = await import("../../src/agents/auth-profiles/oauth.js");
    const storeMod = await import("../../src/agents/auth-profiles/store.js");
    resolveApiKeyForProfile = oauthMod.resolveApiKeyForProfile;
    ensureAuthProfileStore = storeMod.ensureAuthProfileStore;
    return;
  } catch {
    // Fallback to dist (production)
    const oauthMod = await import("../../dist/agents/auth-profiles/oauth.js");
    const storeMod = await import("../../dist/agents/auth-profiles/store.js");
    resolveApiKeyForProfile = oauthMod.resolveApiKeyForProfile;
    ensureAuthProfileStore = storeMod.ensureAuthProfileStore;
  }
}

const PROVIDER_ID = "google-drive";

export async function resolveGoogleDriveCredentials(params: {
  config?: OpenClawConfig;
  agentDir?: string;
  profileId?: string;
}): Promise<OAuthCredentials | null> {
  await loadAuthProfileModules();
  const store = ensureAuthProfileStore(params.agentDir);
  const profileId = params.profileId || `google-drive:default`;

  // Try to resolve the profile (this will refresh if needed)
  const resolved = await resolveApiKeyForProfile({
    cfg: params.config,
    store,
    profileId,
    agentDir: params.agentDir,
  });

  if (!resolved) {
    return null;
  }

  // Get the actual OAuth credentials from the store
  const cred = store.profiles[profileId];
  if (!cred || cred.type !== "oauth" || cred.provider !== PROVIDER_ID) {
    return null;
  }

  return cred;
}

export async function listGoogleDriveProfileIds(agentDir?: string): Promise<string[]> {
  await loadAuthProfileModules();
  const store = ensureAuthProfileStore(agentDir);
  return Object.keys(store.profiles).filter(
    (profileId) => store.profiles[profileId]?.provider === PROVIDER_ID,
  );
}
