import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execSyncMock = vi.fn();

describe("cli credentials", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    execSyncMock.mockReset();
    delete process.env.CODEX_HOME;
    const { resetCliCredentialCachesForTest } = await import("./cli-credentials.js");
    resetCliCredentialCachesForTest();
  });

  it("updates the Claude Code keychain item in place", async () => {
    const commands: string[] = [];

    execSyncMock.mockImplementation((command: unknown) => {
      const cmd = String(command);
      commands.push(cmd);

      if (cmd.includes("find-generic-password")) {
        return JSON.stringify({
          claudeAiOauth: {
            accessToken: "old-access",
            refreshToken: "old-refresh",
            expiresAt: Date.now() + 60_000,
          },
        });
      }

      return "";
    });

    const { writeClaudeCliKeychainCredentials } = await import("./cli-credentials.js");

    const ok = writeClaudeCliKeychainCredentials(
      {
        access: "new-access",
        refresh: "new-refresh",
        expires: Date.now() + 60_000,
      },
      { execSync: execSyncMock },
    );

    expect(ok).toBe(true);
    expect(commands.some((cmd) => cmd.includes("delete-generic-password"))).toBe(false);

    const updateCommand = commands.find((cmd) => cmd.includes("add-generic-password"));
    expect(updateCommand).toContain("-U");
  });

  it("falls back to the file store when the keychain update fails", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-"));
    const credPath = path.join(tempDir, ".claude", ".credentials.json");

    fs.mkdirSync(path.dirname(credPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      credPath,
      `${JSON.stringify(
        {
          claudeAiOauth: {
            accessToken: "old-access",
            refreshToken: "old-refresh",
            expiresAt: Date.now() + 60_000,
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const writeKeychain = vi.fn(() => false);

    const { writeClaudeCliCredentials } = await import("./cli-credentials.js");

    const ok = writeClaudeCliCredentials(
      {
        access: "new-access",
        refresh: "new-refresh",
        expires: Date.now() + 120_000,
      },
      {
        platform: "darwin",
        homeDir: tempDir,
        writeKeychain,
      },
    );

    expect(ok).toBe(true);
    expect(writeKeychain).toHaveBeenCalledTimes(1);

    const updated = JSON.parse(fs.readFileSync(credPath, "utf8")) as {
      claudeAiOauth?: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
      };
    };

    expect(updated.claudeAiOauth?.accessToken).toBe("new-access");
    expect(updated.claudeAiOauth?.refreshToken).toBe("new-refresh");
    expect(updated.claudeAiOauth?.expiresAt).toBeTypeOf("number");
  });

  it("caches Claude Code CLI credentials within the TTL window", async () => {
    execSyncMock.mockImplementation(() =>
      JSON.stringify({
        claudeAiOauth: {
          accessToken: "cached-access",
          refreshToken: "cached-refresh",
          expiresAt: Date.now() + 60_000,
        },
      }),
    );

    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const { readClaudeCliCredentialsCached } = await import("./cli-credentials.js");

    const first = readClaudeCliCredentialsCached({
      allowKeychainPrompt: true,
      ttlMs: 15 * 60 * 1000,
      platform: "darwin",
      execSync: execSyncMock,
    });
    const second = readClaudeCliCredentialsCached({
      allowKeychainPrompt: false,
      ttlMs: 15 * 60 * 1000,
      platform: "darwin",
      execSync: execSyncMock,
    });

    expect(first).toBeTruthy();
    expect(second).toEqual(first);
    expect(execSyncMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes Claude Code CLI credentials after the TTL window", async () => {
    execSyncMock.mockImplementation(() =>
      JSON.stringify({
        claudeAiOauth: {
          accessToken: `token-${Date.now()}`,
          refreshToken: "refresh",
          expiresAt: Date.now() + 60_000,
        },
      }),
    );

    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const { readClaudeCliCredentialsCached } = await import("./cli-credentials.js");

    const first = readClaudeCliCredentialsCached({
      allowKeychainPrompt: true,
      ttlMs: 15 * 60 * 1000,
      platform: "darwin",
      execSync: execSyncMock,
    });

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    const second = readClaudeCliCredentialsCached({
      allowKeychainPrompt: true,
      ttlMs: 15 * 60 * 1000,
      platform: "darwin",
      execSync: execSyncMock,
    });

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(execSyncMock).toHaveBeenCalledTimes(2);
  });

  it("reads Codex credentials from keychain when available", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-codex-"));
    process.env.CODEX_HOME = tempHome;

    const accountHash = "cli|";

    execSyncMock.mockImplementation((command: unknown) => {
      const cmd = String(command);
      expect(cmd).toContain("Codex Auth");
      expect(cmd).toContain(accountHash);
      return JSON.stringify({
        tokens: {
          access_token: "keychain-access",
          refresh_token: "keychain-refresh",
        },
        last_refresh: "2026-01-01T00:00:00Z",
      });
    });

    const { readCodexCliCredentials } = await import("./cli-credentials.js");
    const creds = readCodexCliCredentials({ platform: "darwin", execSync: execSyncMock });

    expect(creds).toMatchObject({
      access: "keychain-access",
      refresh: "keychain-refresh",
      provider: "openai-codex",
    });
  });

  it("falls back to Codex auth.json when keychain is unavailable", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-codex-"));
    process.env.CODEX_HOME = tempHome;
    execSyncMock.mockImplementation(() => {
      throw new Error("not found");
    });

    const authPath = path.join(tempHome, "auth.json");
    fs.mkdirSync(tempHome, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      authPath,
      JSON.stringify({
        tokens: {
          access_token: "file-access",
          refresh_token: "file-refresh",
        },
      }),
      "utf8",
    );

    const { readCodexCliCredentials } = await import("./cli-credentials.js");
    const creds = readCodexCliCredentials({ execSync: execSyncMock });

    expect(creds).toMatchObject({
      access: "file-access",
      refresh: "file-refresh",
      provider: "openai-codex",
    });
  });

  describe("Linux Secret Service", () => {
    it("reads credentials from Linux Secret Service using secret-tool", async () => {
      execSyncMock.mockImplementation((command: unknown) => {
        const cmd = String(command);
        if (cmd.includes("secret-tool lookup")) {
          return JSON.stringify({
            claudeAiOauth: {
              accessToken: "linux-access",
              refreshToken: "linux-refresh",
              expiresAt: Date.now() + 60_000,
            },
          });
        }
        return "";
      });

      const { readClaudeCliCredentials } = await import("./cli-credentials.js");
      const creds = readClaudeCliCredentials({
        allowKeychainPrompt: true,
        platform: "linux",
        execSync: execSyncMock,
      });

      expect(creds).toMatchObject({
        type: "oauth",
        provider: "anthropic",
        access: "linux-access",
        refresh: "linux-refresh",
      });
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining("secret-tool lookup"),
        expect.any(Object),
      );
    });

    it("falls back to file when Linux Secret Service is unavailable", async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-linux-"));
      const credPath = path.join(tempDir, ".claude", ".credentials.json");

      fs.mkdirSync(path.dirname(credPath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(
        credPath,
        JSON.stringify({
          claudeAiOauth: {
            accessToken: "file-access",
            refreshToken: "file-refresh",
            expiresAt: Date.now() + 60_000,
          },
        }),
        "utf8",
      );

      execSyncMock.mockImplementation(() => {
        throw new Error("secret-tool not found");
      });

      const { readClaudeCliCredentials } = await import("./cli-credentials.js");
      const creds = readClaudeCliCredentials({
        allowKeychainPrompt: true,
        platform: "linux",
        homeDir: tempDir,
        execSync: execSyncMock,
      });

      expect(creds).toMatchObject({
        access: "file-access",
        refresh: "file-refresh",
      });
    });

    it("writes credentials to Linux Secret Service", async () => {
      const commands: string[] = [];

      execSyncMock.mockImplementation((command: unknown) => {
        const cmd = String(command);
        commands.push(cmd);

        if (cmd.includes("secret-tool lookup")) {
          return JSON.stringify({
            claudeAiOauth: {
              accessToken: "old-access",
              refreshToken: "old-refresh",
              expiresAt: Date.now() + 60_000,
            },
          });
        }
        return "";
      });

      const { writeClaudeCliLinuxSecretServiceCredentials } = await import("./cli-credentials.js");

      const ok = writeClaudeCliLinuxSecretServiceCredentials(
        {
          access: "new-access",
          refresh: "new-refresh",
          expires: Date.now() + 60_000,
        },
        { execSync: execSyncMock },
      );

      expect(ok).toBe(true);
      expect(commands.some((cmd) => cmd.includes("secret-tool store"))).toBe(true);
    });
  });

  describe("Windows Credential Manager", () => {
    it("reads credentials from Windows Credential Manager using PowerShell", async () => {
      execSyncMock.mockImplementation((command: unknown) => {
        const cmd = String(command);
        if (cmd.includes("powershell") && cmd.includes("CredRead")) {
          return JSON.stringify({
            claudeAiOauth: {
              accessToken: "windows-access",
              refreshToken: "windows-refresh",
              expiresAt: Date.now() + 60_000,
            },
          });
        }
        return "";
      });

      const { readClaudeCliCredentials } = await import("./cli-credentials.js");
      const creds = readClaudeCliCredentials({
        allowKeychainPrompt: true,
        platform: "win32",
        execSync: execSyncMock,
      });

      expect(creds).toMatchObject({
        type: "oauth",
        provider: "anthropic",
        access: "windows-access",
        refresh: "windows-refresh",
      });
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining("powershell"),
        expect.any(Object),
      );
    });

    it("falls back to file when Windows Credential Manager is unavailable", async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-win-"));
      const credPath = path.join(tempDir, ".claude", ".credentials.json");

      fs.mkdirSync(path.dirname(credPath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(
        credPath,
        JSON.stringify({
          claudeAiOauth: {
            accessToken: "file-access",
            refreshToken: "file-refresh",
            expiresAt: Date.now() + 60_000,
          },
        }),
        "utf8",
      );

      execSyncMock.mockImplementation(() => {
        throw new Error("powershell not found");
      });

      const { readClaudeCliCredentials } = await import("./cli-credentials.js");
      const creds = readClaudeCliCredentials({
        allowKeychainPrompt: true,
        platform: "win32",
        homeDir: tempDir,
        execSync: execSyncMock,
      });

      expect(creds).toMatchObject({
        access: "file-access",
        refresh: "file-refresh",
      });
    });

    it("writes credentials to Windows Credential Manager", async () => {
      const commands: string[] = [];

      execSyncMock.mockImplementation((command: unknown) => {
        const cmd = String(command);
        commands.push(cmd);

        if (cmd.includes("CredRead")) {
          return JSON.stringify({
            claudeAiOauth: {
              accessToken: "old-access",
              refreshToken: "old-refresh",
              expiresAt: Date.now() + 60_000,
            },
          });
        }
        if (cmd.includes("CredWrite")) {
          return "True";
        }
        return "";
      });

      const { writeClaudeCliWindowsCredentialManagerCredentials } =
        await import("./cli-credentials.js");

      const ok = writeClaudeCliWindowsCredentialManagerCredentials(
        {
          access: "new-access",
          refresh: "new-refresh",
          expires: Date.now() + 60_000,
        },
        { execSync: execSyncMock },
      );

      expect(ok).toBe(true);
      expect(commands.some((cmd) => cmd.includes("CredWrite"))).toBe(true);
    });
  });

  describe("writeClaudeCliCredentials cross-platform", () => {
    it("uses Linux Secret Service on linux platform", async () => {
      const commands: string[] = [];

      execSyncMock.mockImplementation((command: unknown) => {
        const cmd = String(command);
        commands.push(cmd);

        if (cmd.includes("secret-tool lookup")) {
          return JSON.stringify({
            claudeAiOauth: {
              accessToken: "old-access",
              refreshToken: "old-refresh",
              expiresAt: Date.now() + 60_000,
            },
          });
        }
        return "";
      });

      const { writeClaudeCliCredentials } = await import("./cli-credentials.js");

      const ok = writeClaudeCliCredentials(
        {
          access: "new-access",
          refresh: "new-refresh",
          expires: Date.now() + 60_000,
        },
        {
          platform: "linux",
          execSync: execSyncMock,
        },
      );

      expect(ok).toBe(true);
      expect(commands.some((cmd) => cmd.includes("secret-tool"))).toBe(true);
    });

    it("uses Windows Credential Manager on win32 platform", async () => {
      const commands: string[] = [];

      execSyncMock.mockImplementation((command: unknown) => {
        const cmd = String(command);
        commands.push(cmd);

        if (cmd.includes("CredRead")) {
          return JSON.stringify({
            claudeAiOauth: {
              accessToken: "old-access",
              refreshToken: "old-refresh",
              expiresAt: Date.now() + 60_000,
            },
          });
        }
        if (cmd.includes("CredWrite")) {
          return "True";
        }
        return "";
      });

      const { writeClaudeCliCredentials } = await import("./cli-credentials.js");

      const ok = writeClaudeCliCredentials(
        {
          access: "new-access",
          refresh: "new-refresh",
          expires: Date.now() + 60_000,
        },
        {
          platform: "win32",
          execSync: execSyncMock,
        },
      );

      expect(ok).toBe(true);
      expect(commands.some((cmd) => cmd.includes("powershell"))).toBe(true);
    });
  });
});
