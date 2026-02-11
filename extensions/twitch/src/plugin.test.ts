import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const _require = createRequire(import.meta.url);
const HAS_TWURPLE = (() => {
  try {
    _require.resolve("@twurple/auth");
    return true;
  } catch {
    return false;
  }
})();

if (HAS_TWURPLE) {
  const { twitchPlugin } = await import("./plugin.js");

  describe("twitchPlugin.status.buildAccountSnapshot", () => {
    it("uses the resolved account ID for multi-account configs", async () => {
      const secondary = {
        channel: "secondary-channel",
        username: "secondary",
        accessToken: "oauth:secondary-token",
        clientId: "secondary-client",
        enabled: true,
      };

      const cfg = {
        channels: {
          twitch: {
            accounts: {
              default: {
                channel: "default-channel",
                username: "default",
                accessToken: "oauth:default-token",
                clientId: "default-client",
                enabled: true,
              },
              secondary,
            },
          },
        },
      } as OpenClawConfig;

      const snapshot = await twitchPlugin.status?.buildAccountSnapshot?.({
        account: secondary,
        cfg,
      });

      expect(snapshot?.accountId).toBe("secondary");
    });
  });
} else {
  describe.skip("twitchPlugin (requires @twurple/auth)", () => {});
}
