/**
 * Gmail OAuth2 authentication.
 *
 * Security:
 * - OAuth2 tokens stored with 0o600 permissions
 * - Automatic token refresh
 * - Scopes limited to minimum needed
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { getGmailOAuth, getGmailTokens, setGmailTokens, clearGmailTokens, hasGmailOAuth, hasGmailTokens } from '../infra/credentials.js';

// Gmail API scopes (minimal permissions)
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
] as const;

/**
 * Create OAuth2 client from stored credentials.
 */
export function createOAuth2Client(): OAuth2Client | null {
  const oauth = getGmailOAuth();

  if (!oauth) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    oauth.clientId,
    oauth.clientSecret,
    oauth.redirectUri
  );

  // Set tokens if available
  const tokens = getGmailTokens();
  if (tokens) {
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
    });

    // Set up automatic token refresh
    oauth2Client.on('tokens', (newTokens) => {
      const currentTokens = getGmailTokens();
      setGmailTokens({
        accessToken: newTokens.access_token || currentTokens?.accessToken || '',
        refreshToken: newTokens.refresh_token || currentTokens?.refreshToken || '',
        expiryDate: newTokens.expiry_date || currentTokens?.expiryDate || 0,
      });
    });
  }

  return oauth2Client;
}

/**
 * Generate OAuth2 authorization URL.
 */
export function getAuthUrl(): string | null {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    return null;
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [...GMAIL_SCOPES],
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<boolean> {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens from Google');
    }

    setGmailTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || 0,
    });

    return true;
  } catch (error) {
    console.error('Failed to exchange code for tokens:', error);
    return false;
  }
}

/**
 * Check if Gmail is authenticated.
 */
export function isAuthenticated(): boolean {
  return hasGmailOAuth() && hasGmailTokens();
}

/**
 * Check if Gmail OAuth is configured (but maybe not authenticated).
 */
export function isConfigured(): boolean {
  return hasGmailOAuth();
}

/**
 * Revoke Gmail access and clear tokens.
 */
export async function revokeAccess(): Promise<void> {
  const oauth2Client = createOAuth2Client();

  if (oauth2Client) {
    const tokens = getGmailTokens();
    if (tokens?.accessToken) {
      try {
        await oauth2Client.revokeToken(tokens.accessToken);
      } catch {
        // Ignore revoke errors
      }
    }
  }

  clearGmailTokens();
}

/**
 * Refresh access token if needed.
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    return false;
  }

  const tokens = getGmailTokens();
  if (!tokens) {
    return false;
  }

  // Check if token is expired or will expire soon (within 5 minutes)
  const now = Date.now();
  const expiryBuffer = 5 * 60 * 1000;

  if (tokens.expiryDate && tokens.expiryDate - now < expiryBuffer) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      setGmailTokens({
        accessToken: credentials.access_token || tokens.accessToken,
        refreshToken: credentials.refresh_token || tokens.refreshToken,
        expiryDate: credentials.expiry_date || 0,
      });
      return true;
    } catch {
      return false;
    }
  }

  return true;
}
