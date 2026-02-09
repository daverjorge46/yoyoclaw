import { randomUUID } from "node:crypto";

const KIMI_OAUTH_CLIENT_ID = "17e5f671-d194-4dfb-9706-5516cb48c098";
const KIMI_OAUTH_DEVICE_ENDPOINT = "https://auth.kimi.com/api/oauth/device_authorization";
const KIMI_OAUTH_TOKEN_ENDPOINT = "https://auth.kimi.com/api/oauth/token";
const KIMI_OAUTH_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

export type KimiOAuthAuthorization = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
};

export type KimiOAuthToken = {
  access: string;
  refresh: string;
  expires: number;
};

function toFormUrlEncoded(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

async function requestOAuthCode(): Promise<KimiOAuthAuthorization> {
  const response = await fetch(KIMI_OAUTH_DEVICE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "x-request-id": randomUUID(),
    },
    body: toFormUrlEncoded({
      client_id: KIMI_OAUTH_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kimi OAuth authorization failed: ${text || response.statusText}`);
  }

  const payload = (await response.json()) as KimiOAuthAuthorization & { error?: string };
  if (!payload.device_code || !payload.user_code || !payload.verification_uri) {
    throw new Error(
      payload.error ??
        "Kimi OAuth authorization returned an incomplete payload (missing device_code, user_code, or verification_uri).",
    );
  }
  return payload;
}

type TokenResult =
  | { status: "success"; token: KimiOAuthToken }
  | { status: "pending"; message?: string }
  | { status: "error"; message: string };

async function pollOAuthToken(deviceCode: string): Promise<TokenResult> {
  const response = await fetch(KIMI_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: toFormUrlEncoded({
      grant_type: KIMI_OAUTH_GRANT_TYPE,
      client_id: KIMI_OAUTH_CLIENT_ID,
      device_code: deviceCode,
    }),
  });

  const text = await response.text();
  let payload: Record<string, unknown> | undefined;
  if (text) {
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    // Standard OAuth error handling
    const error = payload?.error as string | undefined;
    if (error === "authorization_pending") {
      return { status: "pending", message: "waiting for user authorization" };
    }
    return {
      status: "error",
      message:
        (payload?.error_description as string | undefined) ??
        text ??
        "Kimi OAuth token request failed",
    };
  }

  if (!payload) {
    return { status: "error", message: "Kimi OAuth failed to parse response." };
  }

  const tokenPayload = payload as {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_in?: number | null;
    error?: string;
    error_description?: string;
  };

  // Check for OAuth error in success response
  if (tokenPayload.error) {
    if (tokenPayload.error === "authorization_pending") {
      return { status: "pending", message: tokenPayload.error_description };
    }
    return {
      status: "error",
      message: tokenPayload.error_description ?? `OAuth error: ${tokenPayload.error}`,
    };
  }

  if (!tokenPayload.access_token || !tokenPayload.refresh_token || !tokenPayload.expires_in) {
    return { status: "error", message: "Kimi OAuth returned incomplete token payload." };
  }

  // Calculate expiration with 5-minute safety buffer
  const expires = Date.now() + tokenPayload.expires_in * 1000 - 5 * 60 * 1000;

  return {
    status: "success",
    token: {
      access: tokenPayload.access_token,
      refresh: tokenPayload.refresh_token,
      expires,
    },
  };
}

export async function loginKimiPortalOAuth(params: {
  openUrl: (url: string) => Promise<void>;
  note: (message: string, title?: string) => Promise<void>;
  progress: { update: (message: string) => void; stop: (message?: string) => void };
}): Promise<KimiOAuthToken> {
  const oauth = await requestOAuthCode();
  const verificationUrl = oauth.verification_uri_complete;

  const noteLines = [
    `Open ${verificationUrl} to approve access.`,
    `If prompted, enter the code ${oauth.user_code}.`,
    `Expires in ${oauth.expires_in} seconds.`,
  ];
  await params.note(noteLines.join("\n"), "Kimi OAuth");

  try {
    await params.openUrl(verificationUrl);
  } catch {
    // Fall back to manual copy/paste if browser open fails.
  }

  let pollIntervalMs = oauth.interval * 1000;
  const expireTimeMs = Date.now() + oauth.expires_in * 1000;

  while (Date.now() < expireTimeMs) {
    params.progress.update("Waiting for Kimi OAuth approval…");
    const result = await pollOAuthToken(oauth.device_code);

    if (result.status === "success") {
      return result.token;
    }

    if (result.status === "error") {
      throw new Error(`Kimi OAuth failed: ${result.message}`);
    }

    if (result.status === "pending") {
      // Exponential backoff up to 10 seconds
      pollIntervalMs = Math.min(pollIntervalMs * 1.5, 10000);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Kimi OAuth timed out waiting for authorization.");
}
