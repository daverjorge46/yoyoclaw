/**
 * Profile Manager - Fast switching between authenticated model configurations
 *
 * This file should be placed at: src/profiles/profiles.ts
 * Implements: moltbot profiles [list|add|use|delete|current|status|show]
 *
 * NOTE: This is distinct from src/cli/profile.ts which handles --profile/--dev CLI flags.
 * This module manages saved model configuration profiles for quick switching.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ProfileMeta {
  currentProfile: string | null;
  profiles: Record<
    string,
    {
      model: string;
      provider: string;
      createdAt: string;
    }
  >;
}

export interface Profile {
  name: string;
  description: string;
  model: string;
  provider: string;
  createdAt: string;
  config: Record<string, unknown>;
  env: string;
}

export interface ProfileListItem {
  name: string;
  model: string;
  provider: string;
  description?: string;
}

function resolveStateDir(): string {
  // Honor CLAWDBOT_STATE_DIR if set (for multi-profile CLI support)
  const envDir = process.env.CLAWDBOT_STATE_DIR?.trim();
  if (envDir) return envDir;
  return path.join(os.homedir(), ".moltbot");
}

export class ProfileManager {
  private readonly configDir: string;
  private readonly profilesDir: string;
  private readonly configFile: string;
  private readonly envFile: string;
  private readonly metaFile: string;

  constructor(stateDir?: string) {
    this.configDir = stateDir ?? resolveStateDir();
    this.profilesDir = path.join(this.configDir, "profiles");
    this.configFile = path.join(this.configDir, "moltbot.json");
    this.envFile = path.join(this.configDir, ".env");
    this.metaFile = path.join(this.profilesDir, ".meta.json");
  }

  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.profilesDir, { recursive: true });
  }

  async getMeta(): Promise<ProfileMeta> {
    try {
      const content = await fs.readFile(this.metaFile, "utf-8");
      return JSON.parse(content) as ProfileMeta;
    } catch {
      return { currentProfile: null, profiles: {} };
    }
  }

  async saveMeta(meta: ProfileMeta): Promise<void> {
    await this.ensureDirectories();
    await fs.writeFile(this.metaFile, JSON.stringify(meta, null, 2));
  }

  async listProfiles(): Promise<ProfileListItem[]> {
    await this.ensureDirectories();
    const profiles: ProfileListItem[] = [];

    try {
      const files = await fs.readdir(this.profilesDir);
      for (const file of files) {
        if (file.endsWith(".json") && file !== ".meta.json") {
          const name = file.replace(".json", "");
          const profile = await this.getProfile(name);
          if (profile) {
            profiles.push({
              name,
              model: profile.model,
              provider: profile.provider,
              description: profile.description,
            });
          }
        }
      }
    } catch {
      return [];
    }

    return profiles;
  }

  async profileExists(name: string): Promise<boolean> {
    const profilePath = path.join(this.profilesDir, `${name}.json`);
    try {
      await fs.access(profilePath);
      return true;
    } catch {
      return false;
    }
  }

  async getProfile(name: string): Promise<Profile | null> {
    const profilePath = path.join(this.profilesDir, `${name}.json`);
    try {
      const content = await fs.readFile(profilePath, "utf-8");
      return JSON.parse(content) as Profile;
    } catch {
      return null;
    }
  }

  async getCurrentConfig(): Promise<Record<string, unknown>> {
    try {
      const content = await fs.readFile(this.configFile, "utf-8");
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error('moltbot.json not found. Run "moltbot onboard" first.');
    }
  }

  async getCurrentEnv(): Promise<string> {
    try {
      return await fs.readFile(this.envFile, "utf-8");
    } catch {
      return "";
    }
  }

  extractModelInfo(config: Record<string, unknown>): { model: string; provider: string } {
    const agents = config?.agents as Record<string, unknown> | undefined;
    const defaults = agents?.defaults as Record<string, unknown> | undefined;
    const modelConfig = defaults?.model as Record<string, unknown> | undefined;
    const model = (modelConfig?.primary as string) || "unknown";
    const parts = model.split("/");
    return {
      model,
      provider: parts[0] || "unknown",
    };
  }

  async saveProfile(name: string, description = ""): Promise<void> {
    await this.ensureDirectories();

    const config = await this.getCurrentConfig();
    const envContent = await this.getCurrentEnv();
    const { model, provider } = this.extractModelInfo(config);

    const profile: Profile = {
      name,
      description,
      model,
      provider,
      createdAt: new Date().toISOString(),
      config,
      env: envContent,
    };

    const profilePath = path.join(this.profilesDir, `${name}.json`);
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));

    const meta = await this.getMeta();
    meta.profiles[name] = { model, provider, createdAt: profile.createdAt };
    meta.currentProfile = name;
    await this.saveMeta(meta);
  }

  async useProfile(name: string, options: { backup?: boolean } = {}): Promise<void> {
    const profile = await this.getProfile(name);
    if (!profile) {
      throw new Error(`Profile "${name}" not found.`);
    }

    if (options.backup !== false) {
      await this.backupCurrentConfig();
    }

    await fs.writeFile(this.configFile, JSON.stringify(profile.config, null, 2));

    if (profile.env) {
      await fs.writeFile(this.envFile, profile.env);
    }

    const meta = await this.getMeta();
    meta.currentProfile = name;
    await this.saveMeta(meta);
  }

  async deleteProfile(name: string): Promise<void> {
    const profilePath = path.join(this.profilesDir, `${name}.json`);
    await fs.unlink(profilePath);

    const meta = await this.getMeta();
    delete meta.profiles[name];
    if (meta.currentProfile === name) {
      meta.currentProfile = null;
    }
    await this.saveMeta(meta);
  }

  async getCurrentProfile(): Promise<string | null> {
    const meta = await this.getMeta();
    return meta.currentProfile;
  }

  async backupCurrentConfig(): Promise<string | null> {
    const backupDir = path.join(this.configDir, "backups");
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    let backedUp = false;

    try {
      const config = await fs.readFile(this.configFile, "utf-8");
      const configBackupPath = path.join(backupDir, `moltbot-${timestamp}.json`);
      await fs.writeFile(configBackupPath, config);
      backedUp = true;
    } catch {
      // Config doesn't exist yet
    }

    try {
      const env = await fs.readFile(this.envFile, "utf-8");
      await fs.writeFile(path.join(backupDir, `env-${timestamp}`), env);
      backedUp = true;
    } catch {
      // Env doesn't exist yet
    }

    return backedUp ? timestamp : null;
  }

  async restartGateway(): Promise<void> {
    try {
      await execAsync("moltbot gateway restart");
    } catch (error) {
      throw new Error(`Failed to restart gateway: ${(error as Error).message}`);
    }
  }

  getStatus(): {
    configDir: string;
    configFile: string;
    profilesDir: string;
    backupsDir: string;
  } {
    return {
      configDir: this.configDir,
      configFile: this.configFile,
      profilesDir: this.profilesDir,
      backupsDir: path.join(this.configDir, "backups"),
    };
  }
}

export function createProfileManager(stateDir?: string): ProfileManager {
  return new ProfileManager(stateDir);
}

// Default singleton instance
export const profileManager = new ProfileManager();
