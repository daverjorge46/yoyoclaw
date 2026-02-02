import {
  getChatChannelMeta,
  type ChannelPlugin,
  type ResolvedSpixiAccount, // To be defined
} from "openclaw/plugin-sdk";
import { getSpixiRuntime } from "./runtime.js";

const meta = getChatChannelMeta("spixi");

export const spixiPlugin: ChannelPlugin<any> = {
  id: "spixi",
  meta: {
    ...meta,
    showConfigured: true,
    quickstartAllowFrom: true,
  },
  agentTools: () => [
    {
      name: "spixi_add_contact",
      description: "Add a new Spixi contact and send a friend request.",
      schema: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The Spixi wallet address to add.",
          },
        },
        required: ["address"],
      },
      run: async ({ address }) => {
        const result = await getSpixiRuntime().channel.spixi.addContact(address);
        return result;
      },
    },
  ],
  capabilities: {
    chatTypes: ["direct"],
    polls: false,
    reactions: false,
    media: false,
  },
  outbound: {
    deliveryMode: "gateway",
    sendText: async ({ to, text }) => {
      const result = await getSpixiRuntime().channel.spixi.sendMessage(to, text);
      return { channel: "spixi", ...result };
    },
  },
  gateway: {
    startAccount: async (ctx) => {
      const { account, runtime, abortSignal, log } = ctx;
      log?.info(`[${account.accountId}] starting spixi bridge`);
      
      // Initialize MQTT listener here using account config
      // (Similar to our spixi-bridge.js logic)
      
      return {
        stop: async () => {
          log?.info(`[${account.accountId}] stopping spixi bridge`);
          // Cleanup MQTT
        }
      };
    },
  },
};
