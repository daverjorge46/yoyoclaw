import type { GatewayRequestHandlers } from "./types.js";
import { listChatCommands } from "../../auto-reply/commands-registry.js";

export const commandsHandlers: GatewayRequestHandlers = {
  "commands.list": ({ respond }) => {
    const commands = listChatCommands();
    const result = commands.map((cmd) => ({
      name: cmd.nativeName ?? cmd.key,
      description: cmd.description,
      category: cmd.category ?? "general",
      acceptsArgs: cmd.acceptsArgs,
    }));
    respond(true, result);
  },
};
