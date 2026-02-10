import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "./types.js";
import { withTempHome } from "./test-helpers.js";

describe("config env reference preservation", () => {
  it("preserves ${VAR} placeholders when writing unchanged resolved values", async () => {
    const previousToken = process.env.GATEWAY_AUTH_TOKEN;
    process.env.GATEWAY_AUTH_TOKEN = "token-from-env";
    try {
      await withTempHome(async () => {
        const { resolveConfigPath, readConfigFileSnapshot, writeConfigFile } =
          await import("./config.js");
        const configPath = resolveConfigPath();
        await fs.writeFile(
          configPath,
          '{\n  gateway: {\n    mode: "local",\n    auth: { mode: "token", token: "${GATEWAY_AUTH_TOKEN}" }\n  }\n}\n',
          "utf-8",
        );

        const snapshot = await readConfigFileSnapshot();
        expect(snapshot.valid).toBe(true);
        const resolvedToken = (snapshot.config.gateway as { auth?: { token?: string } } | undefined)
          ?.auth?.token;
        expect(resolvedToken).toBe("token-from-env");

        await writeConfigFile(snapshot.config as OpenClawConfig);
        const raw = await fs.readFile(configPath, "utf-8");
        expect(raw).toContain('"token": "${GATEWAY_AUTH_TOKEN}"');
        expect(raw).not.toContain('"token": "token-from-env"');
      });
    } finally {
      if (previousToken === undefined) {
        delete process.env.GATEWAY_AUTH_TOKEN;
      } else {
        process.env.GATEWAY_AUTH_TOKEN = previousToken;
      }
    }
  });

  it("keeps explicit value changes when a token is intentionally updated", async () => {
    const previousToken = process.env.GATEWAY_AUTH_TOKEN;
    process.env.GATEWAY_AUTH_TOKEN = "token-from-env";
    try {
      await withTempHome(async () => {
        const { resolveConfigPath, readConfigFileSnapshot, writeConfigFile } =
          await import("./config.js");
        const configPath = resolveConfigPath();
        await fs.writeFile(
          configPath,
          '{\n  gateway: {\n    mode: "local",\n    auth: { mode: "token", token: "${GATEWAY_AUTH_TOKEN}" }\n  }\n}\n',
          "utf-8",
        );

        const snapshot = await readConfigFileSnapshot();
        const next = {
          ...snapshot.config,
          gateway: {
            ...snapshot.config.gateway,
            auth: {
              ...(snapshot.config.gateway as { auth?: Record<string, unknown> } | undefined)?.auth,
              mode: "token",
              token: "token-explicit",
            },
          },
        } as OpenClawConfig;

        await writeConfigFile(next);
        const raw = await fs.readFile(configPath, "utf-8");
        expect(raw).toContain('"token": "token-explicit"');
        expect(raw).not.toContain('"token": "${GATEWAY_AUTH_TOKEN}"');
      });
    } finally {
      if (previousToken === undefined) {
        delete process.env.GATEWAY_AUTH_TOKEN;
      } else {
        process.env.GATEWAY_AUTH_TOKEN = previousToken;
      }
    }
  });
});
