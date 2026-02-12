import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import { applyHardenedConfigOverrides } from "./harden-config.js";

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  } as unknown as ReturnType<typeof import("../logging/subsystem.js").createSubsystemLogger>;
}

describe("applyHardenedConfigOverrides", () => {
  describe("TLS enforcement", () => {
    it("forces TLS enabled when not configured", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.tls?.enabled).toBe(true);
      expect(result.gateway?.tls?.autoGenerate).toBe(true);
      expect(log.info).toHaveBeenCalledWith("harden: TLS forced enabled");
    });

    it("forces TLS enabled even when explicitly disabled", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          tls: {
            enabled: false,
            autoGenerate: false,
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.tls?.enabled).toBe(true);
    });

    it("preserves autoGenerate=false if user set it", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          tls: {
            enabled: true,
            autoGenerate: false,
            certPath: "/custom/cert.pem",
            keyPath: "/custom/key.pem",
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.tls?.enabled).toBe(true);
      expect(result.gateway?.tls?.autoGenerate).toBe(false);
      expect(result.gateway?.tls?.certPath).toBe("/custom/cert.pem");
    });
  });

  describe("Control UI security", () => {
    it("disables dangerouslyDisableDeviceAuth", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          controlUi: {
            dangerouslyDisableDeviceAuth: true,
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.controlUi?.dangerouslyDisableDeviceAuth).toBe(false);
    });

    it("disables allowInsecureAuth", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          controlUi: {
            allowInsecureAuth: true,
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.controlUi?.allowInsecureAuth).toBe(false);
    });

    it("disables both dangerous options when both are enabled", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          controlUi: {
            dangerouslyDisableDeviceAuth: true,
            allowInsecureAuth: true,
            enabled: true,
            basePath: "/custom",
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.controlUi?.dangerouslyDisableDeviceAuth).toBe(false);
      expect(result.gateway?.controlUi?.allowInsecureAuth).toBe(false);
      expect(result.gateway?.controlUi?.enabled).toBe(true);
      expect(result.gateway?.controlUi?.basePath).toBe("/custom");
      expect(log.info).toHaveBeenCalledWith("harden: dangerous Control UI overrides disabled");
    });
  });

  describe("tool restrictions", () => {
    it("sets profile to minimal", () => {
      const cfg: OpenClawConfig = {
        tools: {
          profile: "standard",
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.tools?.profile).toBe("minimal");
    });

    it("adds dangerous tools to deny list", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const denyList = result.tools?.deny ?? [];
      expect(denyList).toContain("exec");
      expect(denyList).toContain("process");
      expect(denyList).toContain("write");
      expect(denyList).toContain("edit");
      expect(denyList).toContain("apply_patch");
      expect(denyList).toContain("gateway");
      expect(denyList).toContain("cron");
      expect(denyList).toContain("nodes");
      expect(denyList).toContain("browser");
      expect(denyList).toContain("canvas");
    });

    it("merges with existing deny list (does not replace)", () => {
      const cfg: OpenClawConfig = {
        tools: {
          deny: ["custom_dangerous_tool", "another_tool"],
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const denyList = result.tools?.deny ?? [];
      expect(denyList).toContain("custom_dangerous_tool");
      expect(denyList).toContain("another_tool");
      expect(denyList).toContain("exec");
      expect(denyList).toContain("process");
    });

    it("disables elevated tool access", () => {
      const cfg: OpenClawConfig = {
        tools: {
          elevated: {
            enabled: true,
            allowedTools: ["some_tool"],
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.tools?.elevated?.enabled).toBe(false);
    });

    it("disables agent-to-agent messaging", () => {
      const cfg: OpenClawConfig = {
        tools: {
          agentToAgent: {
            enabled: true,
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.tools?.agentToAgent?.enabled).toBe(false);
    });

    it("logs tool restriction message", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      applyHardenedConfigOverrides(cfg, log);

      expect(log.info).toHaveBeenCalledWith(
        "harden: tool profile set to minimal with restricted permissions",
      );
    });
  });

  describe("dangerous commands blocking", () => {
    it("blocks data exfiltration commands", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const denyCommands = result.gateway?.nodes?.denyCommands ?? [];
      expect(denyCommands).toContain("camera.snap");
      expect(denyCommands).toContain("camera.clip");
      expect(denyCommands).toContain("screen.record");
    });

    it("blocks PII modification commands", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const denyCommands = result.gateway?.nodes?.denyCommands ?? [];
      expect(denyCommands).toContain("contacts.add");
      expect(denyCommands).toContain("calendar.add");
      expect(denyCommands).toContain("reminders.add");
      expect(denyCommands).toContain("sms.send");
    });

    it("blocks dangerous shell patterns", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const denyCommands = result.gateway?.nodes?.denyCommands ?? [];
      expect(denyCommands).toContain("rm -rf");
      expect(denyCommands).toContain("rm -fr");
      expect(denyCommands).toContain("curl|");
      expect(denyCommands).toContain("wget|");
      expect(denyCommands).toContain("git push --force");
      expect(denyCommands).toContain("git push -f");
      expect(denyCommands).toContain("git reset --hard");
      expect(denyCommands).toContain("mkfs");
      expect(denyCommands).toContain("dd if=");
      expect(denyCommands).toContain("chmod 777");
      expect(denyCommands).toContain("nc -e");
      expect(denyCommands).toContain("bash -i");
    });

    it("merges with existing denyCommands (does not replace)", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          nodes: {
            denyCommands: ["custom_command", "another_blocked"],
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const denyCommands = result.gateway?.nodes?.denyCommands ?? [];
      expect(denyCommands).toContain("custom_command");
      expect(denyCommands).toContain("another_blocked");
      expect(denyCommands).toContain("rm -rf");
    });

    it("deduplicates merged denyCommands", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          nodes: {
            denyCommands: ["rm -rf", "custom_command", "curl|"],
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const denyCommands = result.gateway?.nodes?.denyCommands ?? [];
      const rmRfCount = denyCommands.filter((cmd) => cmd === "rm -rf").length;
      const curlCount = denyCommands.filter((cmd) => cmd === "curl|").length;
      expect(rmRfCount).toBe(1);
      expect(curlCount).toBe(1);
    });

    it("logs the count of blocked commands", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      applyHardenedConfigOverrides(cfg, log);

      expect(log.info).toHaveBeenCalledWith(
        expect.stringMatching(/harden: \d+ dangerous commands blocked/),
      );
    });
  });

  describe("sandbox isolation", () => {
    it("sets network isolation to none", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.agents?.defaults?.sandbox?.docker?.network).toBe("none");
    });

    it("clears DNS and extraHosts", () => {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: {
              docker: {
                dns: ["8.8.8.8", "1.1.1.1"],
                extraHosts: ["host.docker.internal:host-gateway"],
              },
            },
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.agents?.defaults?.sandbox?.docker?.dns).toEqual([]);
      expect(result.agents?.defaults?.sandbox?.docker?.extraHosts).toEqual([]);
    });

    it("sets readOnlyRoot to true", () => {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: {
              docker: {
                readOnlyRoot: false,
              },
            },
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.agents?.defaults?.sandbox?.docker?.readOnlyRoot).toBe(true);
    });

    it("configures tmpfs mounts for writable directories", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      const tmpfs = result.agents?.defaults?.sandbox?.docker?.tmpfs ?? [];
      expect(tmpfs).toContain("/tmp:size=100m,mode=1777");
      expect(tmpfs).toContain("/var/tmp:size=50m,mode=1777");
    });

    it("drops all capabilities", () => {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: {
              docker: {
                capDrop: ["NET_RAW"],
                capAdd: ["SYS_ADMIN"],
              },
            },
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.agents?.defaults?.sandbox?.docker?.capDrop).toEqual(["ALL"]);
    });

    it("uses default resource limits when not configured", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.agents?.defaults?.sandbox?.docker?.memory).toBe("1g");
      expect(result.agents?.defaults?.sandbox?.docker?.memorySwap).toBe("1g");
      expect(result.agents?.defaults?.sandbox?.docker?.cpus).toBe(2);
      expect(result.agents?.defaults?.sandbox?.docker?.pidsLimit).toBe(256);
    });

    it("preserves user-configured resource limits", () => {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: {
              docker: {
                memory: "4g",
                memorySwap: "8g",
                cpus: 8,
                pidsLimit: 1024,
              },
            },
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.agents?.defaults?.sandbox?.docker?.memory).toBe("4g");
      expect(result.agents?.defaults?.sandbox?.docker?.memorySwap).toBe("8g");
      expect(result.agents?.defaults?.sandbox?.docker?.cpus).toBe(8);
      expect(result.agents?.defaults?.sandbox?.docker?.pidsLimit).toBe(1024);
    });

    it("logs sandbox isolation message", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      applyHardenedConfigOverrides(cfg, log);

      expect(log.info).toHaveBeenCalledWith(
        "harden: sandbox isolation enforced (network=none, readOnlyRoot, capDrop=ALL)",
      );
    });
  });

  describe("config preservation", () => {
    it("preserves unrelated gateway config", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          bind: "lan",
          mode: "local",
          auth: {
            mode: "token",
            token: "secret",
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.bind).toBe("lan");
      expect(result.gateway?.mode).toBe("local");
      expect(result.gateway?.auth?.mode).toBe("token");
      expect(result.gateway?.auth?.token).toBe("secret");
    });

    it("preserves unrelated top-level config", () => {
      const cfg: OpenClawConfig = {
        models: {
          default: "claude-3-opus",
        },
        skills: {
          remote: {
            enabled: true,
          },
        },
        channels: {
          discord: {
            enabled: true,
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.models?.default).toBe("claude-3-opus");
      expect(result.skills?.remote?.enabled).toBe(true);
      expect(result.channels?.discord?.enabled).toBe(true);
    });

    it("returns a new object (does not mutate original)", () => {
      const cfg: OpenClawConfig = {
        gateway: {
          tls: {
            enabled: false,
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result).not.toBe(cfg);
      expect(cfg.gateway?.tls?.enabled).toBe(false);
      expect(result.gateway?.tls?.enabled).toBe(true);
    });
  });

  describe("logging", () => {
    it("logs all hardening steps", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      applyHardenedConfigOverrides(cfg, log);

      expect(log.info).toHaveBeenCalledTimes(5);
      expect(log.info).toHaveBeenCalledWith("harden: TLS forced enabled");
      expect(log.info).toHaveBeenCalledWith("harden: dangerous Control UI overrides disabled");
      expect(log.info).toHaveBeenCalledWith(
        "harden: tool profile set to minimal with restricted permissions",
      );
      expect(log.info).toHaveBeenCalledWith(
        expect.stringMatching(/harden: \d+ dangerous commands blocked/),
      );
      expect(log.info).toHaveBeenCalledWith(
        "harden: sandbox isolation enforced (network=none, readOnlyRoot, capDrop=ALL)",
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty config", () => {
      const cfg: OpenClawConfig = {};
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.tls?.enabled).toBe(true);
      expect(result.gateway?.controlUi?.dangerouslyDisableDeviceAuth).toBe(false);
      expect(result.tools?.profile).toBe("minimal");
      expect(result.agents?.defaults?.sandbox?.docker?.network).toBe("none");
    });

    it("handles undefined nested properties", () => {
      const cfg: OpenClawConfig = {
        gateway: undefined,
        tools: undefined,
        agents: undefined,
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.gateway?.tls?.enabled).toBe(true);
      expect(result.tools?.profile).toBe("minimal");
      expect(result.agents?.defaults?.sandbox?.docker?.network).toBe("none");
    });

    it("handles deeply nested undefined properties", () => {
      const cfg: OpenClawConfig = {
        agents: {
          defaults: {
            sandbox: undefined,
          },
        },
      };
      const log = createMockLogger();

      const result = applyHardenedConfigOverrides(cfg, log);

      expect(result.agents?.defaults?.sandbox?.docker?.network).toBe("none");
      expect(result.agents?.defaults?.sandbox?.docker?.capDrop).toEqual(["ALL"]);
    });
  });
});
