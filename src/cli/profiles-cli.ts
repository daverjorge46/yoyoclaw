/**
 * Profiles CLI - Command registration for moltbot profiles
 *
 * This file should be placed at: src/cli/profiles-cli.ts
 *
 * To register, add this entry to src/cli/program/register.subclis.ts:
 *
 * {
 *   name: "profiles",
 *   description: "Model configuration profiles",
 *   register: async (program) => {
 *     const mod = await import("../profiles-cli.js");
 *     mod.registerProfilesCli(program);
 *   },
 * },
 */

import type { Command } from "commander";
import chalk from "chalk";
import { createProfileManager } from "../profiles/profiles.js";

export function registerProfilesCli(program: Command): void {
  const manager = createProfileManager();

  const profiles = program
    .command("profiles")
    .description("Manage model configuration profiles for quick switching")
    .addHelpText(
      "after",
      `
Examples:
  $ moltbot profiles list                    List all saved profiles
  $ moltbot profiles add claude-opus         Save current config as "claude-opus"
  $ moltbot profiles use gemini-pro          Switch to "gemini-pro" profile
  $ moltbot profiles use gpt-4o --restart    Switch and restart gateway
  $ moltbot profiles show claude-opus        Show profile details
  $ moltbot profiles delete old-profile      Delete a profile
`,
    );

  // profiles list
  profiles
    .command("list")
    .alias("ls")
    .description("List all saved model profiles")
    .action(async () => {
      const profileList = await manager.listProfiles();
      const current = await manager.getCurrentProfile();

      if (profileList.length === 0) {
        console.log(chalk.yellow("No profiles saved yet."));
        console.log(chalk.gray('Use "moltbot profiles add <name>" to save current config.'));
        return;
      }

      console.log(chalk.bold("\nSaved Profiles:\n"));
      console.log(
        "┌─────────────────────┬────────────────────────────────────┬──────────────────┐",
      );
      console.log(
        "│ Name                │ Model                              │ Provider         │",
      );
      console.log(
        "├─────────────────────┼────────────────────────────────────┼──────────────────┤",
      );

      for (const p of profileList) {
        const isActive = current === p.name;
        const marker = isActive ? "● " : "  ";
        const nameText = (marker + p.name).padEnd(19);
        const displayName = isActive ? chalk.green(nameText) : nameText;
        const model = (p.model || "unknown").substring(0, 34).padEnd(34);
        const provider = (p.provider || "unknown").substring(0, 16).padEnd(16);
        console.log(`│ ${displayName} │ ${model} │ ${provider} │`);
      }

      console.log(
        "└─────────────────────┴────────────────────────────────────┴──────────────────┘",
      );

      if (current) {
        console.log(chalk.green(`\n● Current: ${current}`));
      }
    });

  // profiles add <name>
  profiles
    .command("add <name>")
    .alias("save")
    .description("Save current moltbot.json config as a named profile")
    .option("-d, --description <desc>", "Profile description")
    .option("-f, --force", "Overwrite existing profile")
    .action(async (name: string, options: { description?: string; force?: boolean }) => {
      const exists = await manager.profileExists(name);
      if (exists && !options.force) {
        console.error(chalk.red(`Profile "${name}" already exists. Use --force to overwrite.`));
        process.exit(1);
      }

      try {
        await manager.saveProfile(name, options.description);
        console.log(chalk.green(`✓ Profile "${name}" saved successfully.`));

        const p = await manager.getProfile(name);
        if (p) {
          console.log(chalk.gray(`  Model: ${p.model}`));
          console.log(chalk.gray(`  Provider: ${p.provider}`));
        }
      } catch (error) {
        console.error(chalk.red(`Failed to save profile: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // profiles use <name>
  profiles
    .command("use <name>")
    .alias("switch")
    .description("Switch to a saved profile (updates moltbot.json)")
    .option("--no-backup", "Skip backing up current config")
    .option("--restart", "Restart gateway after switching")
    .action(async (name: string, options: { backup?: boolean; restart?: boolean }) => {
      const exists = await manager.profileExists(name);
      if (!exists) {
        console.error(chalk.red(`Profile "${name}" not found.`));
        console.log(chalk.gray('Use "moltbot profiles list" to see available profiles.'));
        process.exit(1);
      }

      try {
        if (options.backup !== false) {
          const timestamp = await manager.backupCurrentConfig();
          if (timestamp) {
            console.log(chalk.gray("✓ Current config backed up."));
          }
        }

        await manager.useProfile(name, { backup: false });
        console.log(chalk.green(`✓ Switched to profile "${name}".`));

        const p = await manager.getProfile(name);
        if (p) {
          console.log(chalk.cyan(`  Model: ${p.model}`));
        }

        if (options.restart) {
          console.log(chalk.gray("Restarting gateway..."));
          await manager.restartGateway();
          console.log(chalk.green("✓ Gateway restarted."));
        } else {
          console.log(chalk.yellow('\nNote: Run "moltbot gateway restart" to apply changes.'));
        }
      } catch (error) {
        console.error(chalk.red(`Failed to switch profile: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // profiles delete <name>
  profiles
    .command("delete <name>")
    .alias("rm")
    .description("Delete a saved profile")
    .option("-f, --force", "Skip confirmation")
    .action(async (name: string, options: { force?: boolean }) => {
      const exists = await manager.profileExists(name);
      if (!exists) {
        console.error(chalk.red(`Profile "${name}" not found.`));
        process.exit(1);
      }

      if (!options.force) {
        // Use clack prompts for consistency with moltbot codebase
        const { confirm } = await import("@clack/prompts");
        const shouldDelete = await confirm({
          message: `Delete profile "${name}"?`,
          initialValue: false,
        });

        if (!shouldDelete || typeof shouldDelete === "symbol") {
          console.log(chalk.gray("Cancelled."));
          return;
        }
      }

      try {
        await manager.deleteProfile(name);
        console.log(chalk.green(`✓ Profile "${name}" deleted.`));
      } catch (error) {
        console.error(chalk.red(`Failed to delete profile: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // profiles current
  profiles
    .command("current")
    .description("Show which profile is currently active")
    .action(async () => {
      const current = await manager.getCurrentProfile();
      if (current) {
        console.log(chalk.green(`Current profile: ${current}`));
        const p = await manager.getProfile(current);
        if (p) {
          console.log(chalk.gray(`  Model: ${p.model}`));
          console.log(chalk.gray(`  Provider: ${p.provider}`));
        }
      } else {
        console.log(chalk.yellow("No profile is currently active."));
        console.log(chalk.gray("Current config may have been manually edited."));
      }
    });

  // profiles status
  profiles
    .command("status")
    .description("Show profile manager status and paths")
    .action(async () => {
      const status = manager.getStatus();
      const current = await manager.getCurrentProfile();
      const profileList = await manager.listProfiles();

      console.log(chalk.bold("\nProfile Manager Status:\n"));
      console.log(`  Config dir:    ${chalk.gray(status.configDir)}`);
      console.log(`  Config file:   ${chalk.gray(status.configFile)}`);
      console.log(`  Profiles dir:  ${chalk.gray(status.profilesDir)}`);
      console.log(`  Backups dir:   ${chalk.gray(status.backupsDir)}`);
      console.log(`  Profile count: ${chalk.cyan(profileList.length.toString())}`);

      if (current) {
        console.log(`\n  Active profile: ${chalk.green(current)}`);
      } else {
        console.log(`\n  Active profile: ${chalk.yellow("none")}`);
      }
    });

  // profiles show [name]
  profiles
    .command("show [name]")
    .alias("info")
    .description("Show details of a profile (or current config if no name)")
    .option("--json", "Output as JSON")
    .action(async (name: string | undefined, options: { json?: boolean }) => {
      if (name) {
        const p = await manager.getProfile(name);
        if (!p) {
          console.error(chalk.red(`Profile "${name}" not found.`));
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(p, null, 2));
        } else {
          console.log(chalk.bold(`\nProfile: ${name}\n`));
          console.log(`  Model:       ${chalk.cyan(p.model)}`);
          console.log(`  Provider:    ${chalk.cyan(p.provider)}`);
          console.log(`  Description: ${p.description || chalk.gray("(none)")}`);
          console.log(`  Created:     ${chalk.gray(p.createdAt)}`);
          console.log(`\n${chalk.bold("Config:")}`);
          console.log(chalk.gray(JSON.stringify(p.config, null, 2)));
        }
      } else {
        try {
          const config = await manager.getCurrentConfig();
          if (options.json) {
            console.log(JSON.stringify(config, null, 2));
          } else {
            console.log(chalk.bold("\nCurrent moltbot.json config:\n"));
            console.log(JSON.stringify(config, null, 2));
          }
        } catch (error) {
          console.error(chalk.red((error as Error).message));
          process.exit(1);
        }
      }
    });
}
