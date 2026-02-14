import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withTempHome } from "../../test/helpers/temp-home.js";
import { resolveProviderAuths } from "./provider-usage.auth.js";

describe("resolveProviderAuths key normalization", () => {
  it("strips embedded CR/LF from env keys", async () => {
    await withTempHome(
      async () => {
        const auths = await resolveProviderAuths({
          providers: ["zai", "minimax", "xiaomi"],
        });
        expect(auths).toEqual([
          { provider: "zai", token: "zai-key" },
          { provider: "minimax", token: "minimax-key" },
          { provider: "xiaomi", token: "xiaomi-key" },
        ]);
      },
      {
        env: {
          ZAI_API_KEY: "zai-\r\nkey", // pragma: allowlist secret
          MINIMAX_API_KEY: "minimax-\r\nkey", // pragma: allowlist secret
          XIAOMI_API_KEY: "xiaomi-\r\nkey", // pragma: allowlist secret
        },
      },
    );
  });

  it("strips embedded CR/LF from stored auth profiles (token + api_key)", async () => {
    await withTempHome(
      async (home) => {
        const agentDir = path.join(home, ".openclaw", "agents", "main", "agent");
        await fs.mkdir(agentDir, { recursive: true });
        await fs.writeFile(
          path.join(agentDir, "auth-profiles.json"),
          `${JSON.stringify(
            {
              version: 1,
              profiles: {
                "minimax:default": { type: "token", provider: "minimax", token: "mini-\r\nmax" },
                "xiaomi:default": { type: "api_key", provider: "xiaomi", key: "xiao-\r\nmi" },
              },
            },
            null,
            2,
          )}\n`,
          "utf8",
        );

        const auths = await resolveProviderAuths({
          providers: ["minimax", "xiaomi"],
        });
        expect(auths).toEqual([
          { provider: "minimax", token: "mini-max" },
          { provider: "xiaomi", token: "xiao-mi" },
        ]);
      },
      {
        env: {
          MINIMAX_API_KEY: undefined,
          MINIMAX_CODE_PLAN_KEY: undefined,
          XIAOMI_API_KEY: undefined,
        },
      },
    );
  });

  it("returns multiple oauth-like accounts for the same provider", async () => {
    await withTempHome(async (home) => {
      const agentDir = path.join(home, ".openclaw", "agents", "main", "agent");
      await fs.mkdir(agentDir, { recursive: true });
      await fs.writeFile(
        path.join(agentDir, "auth-profiles.json"),
        `${JSON.stringify(
          {
            version: 1,
            order: {
              "github-copilot": ["github-copilot:work", "github-copilot:personal"],
            },
            profiles: {
              "github-copilot:work": {
                type: "token",
                provider: "github-copilot",
                token: "work-token",
                email: "work@example.com",
              },
              "github-copilot:personal": {
                type: "token",
                provider: "github-copilot",
                token: "personal-token",
                email: "personal@example.com",
              },
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      vi.resetModules();
      const { resolveProviderAuths } = await import("./provider-usage.auth.js");
      const auths = await resolveProviderAuths({
        providers: ["github-copilot"],
        agentDir,
      });
      expect(auths).toEqual([
        {
          provider: "github-copilot",
          token: "work-token",
          profileId: "github-copilot:work",
          accountLabel: "work@example.com",
        },
        {
          provider: "github-copilot",
          token: "personal-token",
          profileId: "github-copilot:personal",
          accountLabel: "personal@example.com",
        },
      ]);
    });
  });
});
