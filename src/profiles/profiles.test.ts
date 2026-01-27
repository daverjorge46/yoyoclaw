/**
 * Profile Manager Tests
 *
 * Run with: pnpm test src/profiles/profiles.test.ts
 *
 * This file should be placed at: src/profiles/profiles.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ProfileManager, createProfileManager } from "./profiles.js";

// Mock filesystem
vi.mock("node:fs/promises");
vi.mock("node:child_process");

describe("ProfileManager", () => {
  let manager: ProfileManager;
  const mockConfigDir = path.join(os.homedir(), ".moltbot");
  const mockProfilesDir = path.join(mockConfigDir, "profiles");

  beforeEach(() => {
    manager = new ProfileManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("uses default state directory", () => {
      const m = new ProfileManager();
      const status = m.getStatus();
      expect(status.configDir).toBe(mockConfigDir);
    });

    it("accepts custom state directory", () => {
      const customDir = "/custom/path";
      const m = new ProfileManager(customDir);
      const status = m.getStatus();
      expect(status.configDir).toBe(customDir);
    });
  });

  describe("createProfileManager", () => {
    it("creates a new ProfileManager instance", () => {
      const m = createProfileManager();
      expect(m).toBeInstanceOf(ProfileManager);
    });

    it("accepts custom state directory", () => {
      const m = createProfileManager("/custom/dir");
      expect(m.getStatus().configDir).toBe("/custom/dir");
    });
  });

  describe("getMeta", () => {
    it("returns empty meta when file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const meta = await manager.getMeta();

      expect(meta).toEqual({ currentProfile: null, profiles: {} });
    });

    it("returns parsed meta when file exists", async () => {
      const mockMeta = {
        currentProfile: "claude-opus",
        profiles: {
          "claude-opus": {
            model: "anthropic/claude-opus-4",
            provider: "anthropic",
            createdAt: "2026-01-28T00:00:00.000Z",
          },
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockMeta));

      const meta = await manager.getMeta();

      expect(meta).toEqual(mockMeta);
    });
  });

  describe("saveMeta", () => {
    it("creates directories and writes meta file", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const meta = {
        currentProfile: "test-profile",
        profiles: {
          "test-profile": {
            model: "anthropic/claude-opus-4",
            provider: "anthropic",
            createdAt: "2026-01-28T00:00:00.000Z",
          },
        },
      };

      await manager.saveMeta(meta);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("profiles"),
        { recursive: true },
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".meta.json"),
        expect.stringContaining('"currentProfile":"test-profile"'),
      );
    });
  });

  describe("listProfiles", () => {
    it("returns empty array when profiles directory is empty", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const profiles = await manager.listProfiles();

      expect(profiles).toEqual([]);
    });

    it("returns profiles list excluding .meta.json", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        "claude-opus.json",
        "gemini-pro.json",
        ".meta.json",
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const mockProfile = {
        name: "claude-opus",
        model: "anthropic/claude-opus-4",
        provider: "anthropic",
        description: "Opus for complex tasks",
        createdAt: "2026-01-28T00:00:00.000Z",
        config: {},
        env: "",
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockProfile));

      const profiles = await manager.listProfiles();

      expect(profiles.length).toBe(2);
      expect(profiles[0].name).toBe("claude-opus");
    });

    it("handles read errors gracefully", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockRejectedValue(new Error("ENOENT"));

      const profiles = await manager.listProfiles();

      expect(profiles).toEqual([]);
    });
  });

  describe("profileExists", () => {
    it("returns true when profile file exists", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const exists = await manager.profileExists("claude-opus");

      expect(exists).toBe(true);
    });

    it("returns false when profile file does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const exists = await manager.profileExists("nonexistent");

      expect(exists).toBe(false);
    });
  });

  describe("getProfile", () => {
    it("returns profile when file exists", async () => {
      const mockProfile = {
        name: "claude-opus",
        model: "anthropic/claude-opus-4",
        provider: "anthropic",
        description: "Test",
        createdAt: "2026-01-28T00:00:00.000Z",
        config: {},
        env: "",
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockProfile));

      const profile = await manager.getProfile("claude-opus");

      expect(profile).toEqual(mockProfile);
    });

    it("returns null when profile does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const profile = await manager.getProfile("nonexistent");

      expect(profile).toBeNull();
    });
  });

  describe("getCurrentConfig", () => {
    it("returns parsed config when file exists", async () => {
      const mockConfig = { agents: { defaults: { model: { primary: "test" } } } };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await manager.getCurrentConfig();

      expect(config).toEqual(mockConfig);
    });

    it("throws error when config file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      await expect(manager.getCurrentConfig()).rejects.toThrow(
        'moltbot.json not found. Run "moltbot onboard" first.',
      );
    });
  });

  describe("getCurrentEnv", () => {
    it("returns env content when file exists", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("ANTHROPIC_API_KEY=sk-xxx");

      const env = await manager.getCurrentEnv();

      expect(env).toBe("ANTHROPIC_API_KEY=sk-xxx");
    });

    it("returns empty string when env file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const env = await manager.getCurrentEnv();

      expect(env).toBe("");
    });
  });

  describe("extractModelInfo", () => {
    it("extracts model and provider from config", () => {
      const config = {
        agents: {
          defaults: {
            model: {
              primary: "anthropic/claude-opus-4",
            },
          },
        },
      };

      const info = manager.extractModelInfo(config);

      expect(info.model).toBe("anthropic/claude-opus-4");
      expect(info.provider).toBe("anthropic");
    });

    it("returns unknown when model path is missing", () => {
      const config = {};

      const info = manager.extractModelInfo(config);

      expect(info.model).toBe("unknown");
      expect(info.provider).toBe("unknown");
    });

    it("handles openrouter model paths", () => {
      const config = {
        agents: {
          defaults: {
            model: {
              primary: "openrouter/anthropic/claude-3.5-sonnet",
            },
          },
        },
      };

      const info = manager.extractModelInfo(config);

      expect(info.model).toBe("openrouter/anthropic/claude-3.5-sonnet");
      expect(info.provider).toBe("openrouter");
    });

    it("handles google/gemini model paths", () => {
      const config = {
        agents: {
          defaults: {
            model: {
              primary: "google/gemini-2.0-flash",
            },
          },
        },
      };

      const info = manager.extractModelInfo(config);

      expect(info.model).toBe("google/gemini-2.0-flash");
      expect(info.provider).toBe("google");
    });
  });

  describe("saveProfile", () => {
    it("saves profile with current config and env", async () => {
      const mockConfig = {
        agents: {
          defaults: {
            model: { primary: "anthropic/claude-opus-4" },
          },
        },
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockConfig)) // getCurrentConfig
        .mockResolvedValueOnce("ANTHROPIC_API_KEY=sk-xxx") // getCurrentEnv
        .mockRejectedValueOnce(new Error("ENOENT")); // getMeta (no existing meta)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await manager.saveProfile("my-profile", "Test profile");

      expect(fs.writeFile).toHaveBeenCalledTimes(2); // profile + meta
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("my-profile.json"),
        expect.stringContaining('"name":"my-profile"'),
      );
    });

    it("updates meta with new profile info", async () => {
      const mockConfig = {
        agents: { defaults: { model: { primary: "anthropic/claude-opus-4" } } },
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockConfig))
        .mockResolvedValueOnce("")
        .mockResolvedValueOnce(JSON.stringify({ currentProfile: null, profiles: {} }));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await manager.saveProfile("test-profile", "Description");

      // Second writeFile call is for meta
      const metaCall = vi.mocked(fs.writeFile).mock.calls[1];
      expect(metaCall[0]).toContain(".meta.json");
      expect(metaCall[1]).toContain('"currentProfile":"test-profile"');
    });
  });

  describe("useProfile", () => {
    it("throws error when profile does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      await expect(manager.useProfile("nonexistent")).rejects.toThrow(
        'Profile "nonexistent" not found.',
      );
    });

    it("writes config and env files when switching profile", async () => {
      const mockProfile = {
        name: "claude-opus",
        model: "anthropic/claude-opus-4",
        provider: "anthropic",
        description: "",
        createdAt: "2026-01-28T00:00:00.000Z",
        config: { agents: {} },
        env: "ANTHROPIC_API_KEY=sk-xxx",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockProfile));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.useProfile("claude-opus");

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("moltbot.json"),
        expect.any(String),
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".env"),
        "ANTHROPIC_API_KEY=sk-xxx",
      );
    });

    it("skips backup when backup option is false", async () => {
      const mockProfile = {
        name: "test",
        model: "test",
        provider: "test",
        description: "",
        createdAt: "2026-01-28T00:00:00.000Z",
        config: {},
        env: "",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockProfile));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.useProfile("test", { backup: false });

      // Should not have created backup directory
      expect(fs.mkdir).not.toHaveBeenCalledWith(
        expect.stringContaining("backups"),
        expect.any(Object),
      );
    });
  });

  describe("deleteProfile", () => {
    it("removes profile file and updates meta", async () => {
      const mockMeta = {
        currentProfile: "claude-opus",
        profiles: {
          "claude-opus": {
            model: "anthropic/claude-opus-4",
            provider: "anthropic",
            createdAt: "2026-01-28T00:00:00.000Z",
          },
        },
      };

      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockMeta));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.deleteProfile("claude-opus");

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining("claude-opus.json"),
      );
    });

    it("clears currentProfile if deleting active profile", async () => {
      const mockMeta = {
        currentProfile: "active-profile",
        profiles: {
          "active-profile": {
            model: "test",
            provider: "test",
            createdAt: "2026-01-28T00:00:00.000Z",
          },
        },
      };

      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockMeta));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await manager.deleteProfile("active-profile");

      const metaCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(metaCall[1]).toContain('"currentProfile":null');
    });
  });

  describe("getCurrentProfile", () => {
    it("returns current profile name from meta", async () => {
      const mockMeta = { currentProfile: "my-profile", profiles: {} };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockMeta));

      const current = await manager.getCurrentProfile();

      expect(current).toBe("my-profile");
    });

    it("returns null when no profile is active", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const current = await manager.getCurrentProfile();

      expect(current).toBeNull();
    });
  });

  describe("backupCurrentConfig", () => {
    it("creates backup directory and copies files", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce('{"config": true}') // config
        .mockResolvedValueOnce("API_KEY=xxx"); // env
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const timestamp = await manager.backupCurrentConfig();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("backups"),
        { recursive: true },
      );
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(timestamp).not.toBeNull();
    });

    it("returns null when no files exist to backup", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const timestamp = await manager.backupCurrentConfig();

      expect(timestamp).toBeNull();
    });
  });

  describe("getStatus", () => {
    it("returns correct paths", () => {
      const status = manager.getStatus();

      expect(status.configDir).toBe(path.join(os.homedir(), ".moltbot"));
      expect(status.configFile).toBe(
        path.join(os.homedir(), ".moltbot", "moltbot.json"),
      );
      expect(status.profilesDir).toBe(
        path.join(os.homedir(), ".moltbot", "profiles"),
      );
      expect(status.backupsDir).toBe(
        path.join(os.homedir(), ".moltbot", "backups"),
      );
    });
  });
});

describe("Profile CLI Commands", () => {
  // Integration tests for CLI commands would go here
  // These would use subprocess execution to test actual CLI behavior

  describe("moltbot profiles list", () => {
    it.todo("displays formatted table of profiles");
    it.todo("shows indicator for active profile");
    it.todo("shows helpful message when no profiles exist");
  });

  describe("moltbot profiles add", () => {
    it.todo("saves current config as named profile");
    it.todo("requires --force to overwrite existing");
    it.todo("accepts --description flag");
  });

  describe("moltbot profiles use", () => {
    it.todo("switches to specified profile");
    it.todo("creates backup by default");
    it.todo("skips backup with --no-backup");
    it.todo("restarts gateway with --restart");
  });

  describe("moltbot profiles delete", () => {
    it.todo("prompts for confirmation by default");
    it.todo("skips prompt with --force");
  });

  describe("moltbot profiles current", () => {
    it.todo("shows active profile name and model");
    it.todo("shows message when no profile is active");
  });

  describe("moltbot profiles status", () => {
    it.todo("displays all relevant paths");
    it.todo("shows profile count");
  });

  describe("moltbot profiles show", () => {
    it.todo("displays profile details");
    it.todo("outputs JSON with --json flag");
    it.todo("shows current config when no name given");
  });
});
