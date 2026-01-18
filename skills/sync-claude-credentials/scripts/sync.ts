#!/usr/bin/env bun
/**
 * Sync Claude Code credentials to k8s secret.yaml
 *
 * Usage: bun skills/sync-claude-credentials/scripts/sync.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CREDENTIALS_PATH = join(homedir(), ".claude", ".credentials.json");
const SECRET_PATH = join(process.cwd(), "k8s", "secret.yaml");

interface ClaudeCredentials {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
    rateLimitTier: string;
  };
}

function main() {
  // Check credentials file exists
  if (!existsSync(CREDENTIALS_PATH)) {
    console.error(`Claude credentials not found at ${CREDENTIALS_PATH}`);
    console.error("Run 'claude login' first to authenticate.");
    process.exit(1);
  }

  // Check secret.yaml exists
  if (!existsSync(SECRET_PATH)) {
    console.error(`Secret file not found at ${SECRET_PATH}`);
    process.exit(1);
  }

  // Read credentials
  const credentialsRaw = readFileSync(CREDENTIALS_PATH, "utf-8");
  const credentials: ClaudeCredentials = JSON.parse(credentialsRaw);

  if (!credentials.claudeAiOauth?.accessToken) {
    console.error("No OAuth access token found in credentials.");
    console.error("Run 'claude login' and sign in with Claude.ai.");
    process.exit(1);
  }

  const { accessToken, expiresAt, subscriptionType } = credentials.claudeAiOauth;

  // Check token expiry
  const now = Date.now();
  const expiresIn = expiresAt - now;
  const expiresInDays = Math.floor(expiresIn / (1000 * 60 * 60 * 24));

  if (expiresIn < 0) {
    console.error("Access token has expired!");
    console.error("Run 'claude login' to refresh.");
    process.exit(1);
  }

  console.log(`Subscription: ${subscriptionType}`);
  console.log(`Token expires in: ${expiresInDays} days`);

  // Read and update secret.yaml
  let secretContent = readFileSync(SECRET_PATH, "utf-8");

  // Update CLAUDE_AI_SESSION_KEY
  const sessionKeyRegex = /(CLAUDE_AI_SESSION_KEY:\s*)"[^"]*"/;
  if (sessionKeyRegex.test(secretContent)) {
    secretContent = secretContent.replace(
      sessionKeyRegex,
      `$1"${accessToken}"`
    );
    console.log("Updated CLAUDE_AI_SESSION_KEY");
  } else {
    console.error("CLAUDE_AI_SESSION_KEY not found in secret.yaml");
    process.exit(1);
  }

  // Write back
  writeFileSync(SECRET_PATH, secretContent);

  console.log("\nSync completed!");
  console.log(`\nTo apply: kubectl apply -f ${SECRET_PATH}`);
}

main();
