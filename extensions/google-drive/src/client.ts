import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
// Dynamic type import for OAuthCredentials (not in plugin SDK)
type OAuthCredentials = import("../../src/agents/auth-profiles/types.js").OAuthCredentials;
import { createOAuth2ClientFromCredentials } from "./auth.js";

let cachedDriveClient: {
  key: string;
  client: ReturnType<typeof google.drive>;
} | null = null;

let cachedDocsClient: {
  key: string;
  client: ReturnType<typeof google.docs>;
} | null = null;

function buildCredentialsKey(credentials: OAuthCredentials): string {
  return `${credentials.access}:${credentials.refresh}:${credentials.expires}`;
}

export function createGoogleDriveClient(
  credentials: OAuthCredentials,
): ReturnType<typeof google.drive> {
  const key = buildCredentialsKey(credentials);
  if (cachedDriveClient && cachedDriveClient.key === key) {
    return cachedDriveClient.client;
  }

  const oauth2Client = createOAuth2ClientFromCredentials(credentials);
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  cachedDriveClient = { key, client: drive };
  return drive;
}

export function createGoogleDocsClient(
  credentials: OAuthCredentials,
): ReturnType<typeof google.docs> {
  const key = buildCredentialsKey(credentials);
  if (cachedDocsClient && cachedDocsClient.key === key) {
    return cachedDocsClient.client;
  }

  const oauth2Client = createOAuth2ClientFromCredentials(credentials);
  const docs = google.docs({ version: "v1", auth: oauth2Client });

  cachedDocsClient = { key, client: docs };
  return docs;
}

export async function refreshAccessTokenIfNeeded(oauth2Client: OAuth2Client): Promise<void> {
  const token = await oauth2Client.getAccessToken();
  if (!token.token) {
    await oauth2Client.refreshAccessToken();
  }
}
