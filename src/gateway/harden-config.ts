import type { loadConfig } from "../config/config.js";
import type { createSubsystemLogger } from "../logging/subsystem.js";

/**
 * Default dangerous commands to block in hardened mode.
 * These commands can exfiltrate data, modify contacts/calendar, or access camera/screen.
 */
const HARDENED_DENY_COMMANDS = [
  // Data exfiltration risks
  "camera.snap",
  "camera.clip",
  "screen.record",
  // PII modification risks
  "contacts.add",
  "calendar.add",
  "reminders.add",
  "sms.send",
  // Dangerous shell patterns (for node.invoke)
  "rm -rf",
  "rm -fr",
  "curl|",
  "wget|",
  "git push --force",
  "git push -f",
  "git reset --hard",
  "mkfs",
  "dd if=",
  "chmod 777",
  "nc -e",
  "bash -i",
];

/**
 * Applies security-hardened configuration overrides.
 * This mutates the config to enforce strict security defaults.
 */
export function applyHardenedConfigOverrides(
  cfg: ReturnType<typeof loadConfig>,
  log: ReturnType<typeof createSubsystemLogger>,
): ReturnType<typeof loadConfig> {
  const hardened = { ...cfg };

  // 1. Force TLS enabled
  hardened.gateway = {
    ...hardened.gateway,
    tls: {
      ...hardened.gateway?.tls,
      enabled: true,
      autoGenerate: hardened.gateway?.tls?.autoGenerate ?? true,
    },
  };
  log.info("harden: TLS forced enabled");

  // 2. Disable dangerous Control UI overrides
  hardened.gateway = {
    ...hardened.gateway,
    controlUi: {
      ...hardened.gateway?.controlUi,
      dangerouslyDisableDeviceAuth: false,
      allowInsecureAuth: false,
    },
  };
  log.info("harden: dangerous Control UI overrides disabled");

  // 3. Apply restricted tool profile (minimal)
  hardened.tools = {
    ...hardened.tools,
    profile: "minimal",
    // Explicitly clear allow list - defense in depth
    // Even though deny list blocks dangerous tools, clearing allow prevents
    // user-configured allow lists from enabling tools outside the minimal profile
    allow: [],
    // Explicitly deny dangerous tools
    deny: [
      ...(hardened.tools?.deny ?? []),
      "exec",
      "process",
      "write",
      "edit",
      "apply_patch",
      "gateway",
      "cron",
      "nodes",
      "browser",
      "canvas",
    ],
    // Disable elevated tool access
    elevated: {
      ...hardened.tools?.elevated,
      enabled: false,
    },
    // Disable agent-to-agent messaging
    agentToAgent: {
      ...hardened.tools?.agentToAgent,
      enabled: false,
    },
  };
  log.info("harden: tool profile set to minimal with cleared allow list");

  // 4. Block dangerous commands
  const existingDenyCommands = hardened.gateway?.nodes?.denyCommands ?? [];
  const mergedDenyCommands = Array.from(
    new Set([...existingDenyCommands, ...HARDENED_DENY_COMMANDS]),
  );
  hardened.gateway = {
    ...hardened.gateway,
    nodes: {
      ...hardened.gateway?.nodes,
      denyCommands: mergedDenyCommands,
    },
  };
  log.info(`harden: ${mergedDenyCommands.length} dangerous commands blocked`);

  // 5. Enforce strict sandbox settings
  hardened.agents = {
    ...hardened.agents,
    defaults: {
      ...hardened.agents?.defaults,
      sandbox: {
        ...hardened.agents?.defaults?.sandbox,
        docker: {
          ...hardened.agents?.defaults?.sandbox?.docker,
          // Network isolation
          network: "none",
          dns: [],
          extraHosts: [],
          // Filesystem protection
          readOnlyRoot: true,
          tmpfs: ["/tmp:size=100m,mode=1777", "/var/tmp:size=50m,mode=1777"],
          // Capability restrictions
          capDrop: ["ALL"],
          // Resource limits
          memory: hardened.agents?.defaults?.sandbox?.docker?.memory ?? "1g",
          memorySwap: hardened.agents?.defaults?.sandbox?.docker?.memorySwap ?? "1g",
          cpus: hardened.agents?.defaults?.sandbox?.docker?.cpus ?? 2,
          pidsLimit: hardened.agents?.defaults?.sandbox?.docker?.pidsLimit ?? 256,
        },
      },
    },
  };
  log.info("harden: sandbox isolation enforced (network=none, readOnlyRoot, capDrop=ALL)");

  return hardened;
}
