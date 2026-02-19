import type { GatewayServiceRuntime } from "./service-runtime.js";
import { loadConfig } from "../config/io.js";
import { resolveGatewayPort } from "../config/paths.js";
import {
  installLaunchAgent,
  isLaunchAgentLoaded,
  readLaunchAgentProgramArguments,
  readLaunchAgentRuntime,
  restartLaunchAgent,
  stopLaunchAgent,
  uninstallLaunchAgent,
} from "./launchd.js";
import {
  readFallbackGatewayRuntime,
  startFallbackGatewayProcess,
  stopFallbackGatewayProcess,
} from "./process-fallback.js";
import {
  installScheduledTask,
  isScheduledTaskInstalled,
  readScheduledTaskCommand,
  readScheduledTaskRuntime,
  restartScheduledTask,
  stopScheduledTask,
  uninstallScheduledTask,
} from "./schtasks.js";
import {
  installSystemdService,
  isSystemdServiceEnabled,
  isSystemdUserServiceAvailable,
  readSystemdServiceExecStart,
  readSystemdServiceRuntime,
  restartSystemdService,
  stopSystemdService,
  uninstallSystemdService,
} from "./systemd.js";

export type GatewayServiceInstallArgs = {
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
  programArguments: string[];
  workingDirectory?: string;
  environment?: Record<string, string | undefined>;
  description?: string;
};

export type GatewayService = {
  label: string;
  loadedText: string;
  notLoadedText: string;
  install: (args: GatewayServiceInstallArgs) => Promise<void>;
  uninstall: (args: {
    env: Record<string, string | undefined>;
    stdout: NodeJS.WritableStream;
  }) => Promise<void>;
  stop: (args: {
    env?: Record<string, string | undefined>;
    stdout: NodeJS.WritableStream;
  }) => Promise<void>;
  restart: (args: {
    env?: Record<string, string | undefined>;
    stdout: NodeJS.WritableStream;
  }) => Promise<void>;
  isLoaded: (args: { env?: Record<string, string | undefined> }) => Promise<boolean>;
  readCommand: (env: Record<string, string | undefined>) => Promise<{
    programArguments: string[];
    workingDirectory?: string;
    environment?: Record<string, string>;
    sourcePath?: string;
  } | null>;
  readRuntime: (env: Record<string, string | undefined>) => Promise<GatewayServiceRuntime>;
};

export function resolveGatewayService(): GatewayService {
  if (process.platform === "darwin") {
    return {
      label: "LaunchAgent",
      loadedText: "loaded",
      notLoadedText: "not loaded",
      install: async (args) => {
        await installLaunchAgent(args);
      },
      uninstall: async (args) => {
        await uninstallLaunchAgent(args);
      },
      stop: async (args) => {
        await stopLaunchAgent({
          stdout: args.stdout,
          env: args.env,
        });
      },
      restart: async (args) => {
        await restartLaunchAgent({
          stdout: args.stdout,
          env: args.env,
        });
      },
      isLoaded: async (args) => isLaunchAgentLoaded(args),
      readCommand: readLaunchAgentProgramArguments,
      readRuntime: readLaunchAgentRuntime,
    };
  }

  if (process.platform === "linux") {
    return {
      label: "systemd",
      loadedText: "enabled",
      notLoadedText: "disabled",
      install: async (args) => {
        if (await isSystemdUserServiceAvailable()) {
          await installSystemdService(args);
          return;
        }
        args.stdout.write(
          "[fallback] systemd --user bus unavailable; starting gateway as background process\n",
        );
        const port = resolveGatewayPort(loadConfig());
        await startFallbackGatewayProcess({ env: args.env, port, stdout: args.stdout });
      },
      uninstall: async (args) => {
        await uninstallSystemdService(args);
      },
      stop: async (args) => {
        if (await isSystemdUserServiceAvailable()) {
          await stopSystemdService({ stdout: args.stdout, env: args.env });
          return;
        }
        args.stdout.write(
          "[fallback] systemd --user bus unavailable; stopping via direct process management\n",
        );
        await stopFallbackGatewayProcess({ env: args.env ?? {}, stdout: args.stdout });
      },
      restart: async (args) => {
        if (await isSystemdUserServiceAvailable()) {
          await restartSystemdService({ stdout: args.stdout, env: args.env });
          return;
        }
        args.stdout.write(
          "[fallback] systemd --user bus unavailable; restarting via direct process management\n",
        );
        const env = args.env ?? {};
        await stopFallbackGatewayProcess({ env, stdout: args.stdout });
        const port = resolveGatewayPort(loadConfig());
        await startFallbackGatewayProcess({ env, port, stdout: args.stdout });
      },
      isLoaded: async (args) => {
        if (await isSystemdUserServiceAvailable()) {
          return isSystemdServiceEnabled(args);
        }
        // In fallback mode the service is always "available" — there is no
        // install/enable step.  Returning true lets lifecycle commands
        // (start, restart, stop) reach the fallback handlers which already
        // handle the "no process running" case gracefully.
        return true;
      },
      readCommand: async (env) => {
        try {
          return await readSystemdServiceExecStart(env);
        } catch {
          return null;
        }
      },
      readRuntime: async (env) => {
        if (await isSystemdUserServiceAvailable()) {
          return await readSystemdServiceRuntime(env);
        }
        return readFallbackGatewayRuntime(env);
      },
    };
  }

  if (process.platform === "win32") {
    return {
      label: "Scheduled Task",
      loadedText: "registered",
      notLoadedText: "missing",
      install: async (args) => {
        await installScheduledTask(args);
      },
      uninstall: async (args) => {
        await uninstallScheduledTask(args);
      },
      stop: async (args) => {
        await stopScheduledTask({
          stdout: args.stdout,
          env: args.env,
        });
      },
      restart: async (args) => {
        await restartScheduledTask({
          stdout: args.stdout,
          env: args.env,
        });
      },
      isLoaded: async (args) => isScheduledTaskInstalled(args),
      readCommand: readScheduledTaskCommand,
      readRuntime: async (env) => await readScheduledTaskRuntime(env),
    };
  }

  throw new Error(`Gateway service install not supported on ${process.platform}`);
}
