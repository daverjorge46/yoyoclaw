import * as fs from "fs";
import { loginKimiPortalOAuth } from "./oauth.ts";

async function main() {
  console.log("Starting Kimi OAuth flow...");
  console.log("This will save tokens to ~/.openclaw/kimi-oauth-tokens.json when complete");
  console.log("");

  try {
    const result = await loginKimiPortalOAuth({
      openUrl: (url) => {
        console.log("\n=== ACTION REQUIRED ===");
        console.log("Open this URL to authorize:");
        console.log(url);
        console.log("");
        console.log("Waiting for approval (polling every few seconds)...");
        console.log("");
      },
      note: (msg, title) => console.log(`[${title}] ${msg}`),
      progress: {
        stop: (msg) => console.log("[Done]", msg),
        update: (msg) => process.stdout.write("."),
      },
    });

    console.log("\n=== OAuth Success ===");
    console.log("Access token:", result.access.slice(0, 20) + "...");
    console.log("Refresh token exists:", !!result.refresh);
    console.log("Expires:", new Date(result.expires).toISOString());

    // Save tokens
    const tokenPath = process.env.HOME + "/.openclaw/kimi-oauth-tokens.json";
    fs.writeFileSync(
      tokenPath,
      JSON.stringify(
        {
          provider: "kimi-portal",
          profile: "kimi-portal:default",
          accessToken: result.access,
          refreshToken: result.refresh,
          expiresAt: result.expires,
          obtainedAt: Date.now(),
        },
        null,
        2,
      ),
    );

    console.log("\nTokens saved to:", tokenPath);
    console.log("\nNow add this to your ~/.openclaw/openclaw.json auth.profiles:");
    console.log(
      JSON.stringify(
        {
          "kimi-portal:default": {
            provider: "kimi-portal",
            mode: "oauth",
            access: result.access,
            refresh: result.refresh,
            expires: result.expires,
          },
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error("\nOAuth failed:", (err as Error).message);
    process.exit(1);
  }
}

main();
