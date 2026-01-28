import { execSync } from "node:child_process";
import type {
  CommandHandler,
  CommandHandlerResult,
  HandleCommandsParams,
} from "./commands-types.js";

export const handleMiyabiCommand: CommandHandler = async (params) => {
  const { command } = params;
  const commandBody = command.commandBodyNormalized;

  if (!commandBody.startsWith("/miyabi")) {
    return null;
  }

  const parts = commandBody.split(/\s+/);
  const action = parts[1]?.toLowerCase();

  if (!action) {
    return {
      shouldContinue: false,
      reply: { text: "❌ Missing action. Use: /miyabi issue|status|agent" },
    };
  }

  try {
    switch (action) {
      case "issue":
        return await handleMiyabiIssue(params, parts.slice(2));
      case "status":
        return await handleMiyabiStatus(params);
      case "agent":
        return await handleMiyabiAgent(params, parts.slice(2));
      default:
        return {
          shouldContinue: false,
          reply: { text: `❌ Unknown action: ${action}. Use: issue|status|agent` },
        };
    }
  } catch (error) {
    console.error("Miyabi command error:", error);
    return {
      shouldContinue: false,
      reply: { text: `❌ Error: ${error instanceof Error ? error.message : String(error)}` },
    };
  }
};

async function handleMiyabiIssue(
  params: HandleCommandsParams,
  args: string[],
): Promise<CommandHandlerResult> {
  const title = args.join(" ").trim();

  if (!title) {
    return {
      shouldContinue: false,
      reply: { text: "❌ Missing issue title. Use: /miyabi issue <title>" },
    };
  }

  const bridgeScript = `${process.env.HOME}/.claude/skills/miyabi-bridge/miyabi-bridge.sh`;

  try {
    const result = execSync(`"${bridgeScript}" issue "${title}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    return {
      shouldContinue: false,
      reply: { text: `✅ ${result.trim()}` },
    };
  } catch (error) {
    return {
      shouldContinue: false,
      reply: {
        text: `❌ Failed to create issue: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

async function handleMiyabiStatus(params: HandleCommandsParams): Promise<CommandHandlerResult> {
  const bridgeScript = `${process.env.HOME}/.claude/skills/miyabi-bridge/miyabi-bridge.sh`;

  try {
    const result = execSync(`"${bridgeScript}" status`, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    return {
      shouldContinue: false,
      reply: { text: `📊 Miyabi Status:\n\`\`\`\n${result.trim()}\n\`\`\`` },
    };
  } catch (error) {
    return {
      shouldContinue: false,
      reply: {
        text: `❌ Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

async function handleMiyabiAgent(
  params: HandleCommandsParams,
  args: string[],
): Promise<CommandHandlerResult> {
  const agent = args[0];
  const cmd = args.slice(1).join(" ");

  if (!agent || !cmd) {
    return {
      shouldContinue: false,
      reply: { text: "❌ Missing agent or command. Use: /miyabi agent <name> <command>" },
    };
  }

  const bridgeScript = `${process.env.HOME}/.claude/skills/miyabi-bridge/miyabi-bridge.sh`;

  try {
    // Escape the command for shell - use double quotes around the whole command
    const result = execSync(`"${bridgeScript}" agent "${agent}" "${cmd}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    return {
      shouldContinue: false,
      reply: { text: `✅ Command sent to ${agent}:\n\`\`\`\n${result.trim()}\n\`\`\`` },
    };
  } catch (error) {
    return {
      shouldContinue: false,
      reply: {
        text: `❌ Failed to send command: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}
