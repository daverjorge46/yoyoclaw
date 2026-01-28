import { Type } from "@sinclair/typebox";
import {
  listChannelMessageActions,
  supportsChannelMessageButtons,
  supportsChannelMessageCards,
} from "../../channels/plugins/message-actions.js";
import {
  CHANNEL_MESSAGE_ACTION_NAMES,
  type ChannelMessageActionName,
} from "../../channels/plugins/types.js";
import { BLUEBUBBLES_GROUP_ACTIONS } from "../../channels/plugins/bluebubbles-actions.js";
import type { MoltbotConfig } from "../../config/config.js";
import { loadConfig } from "../../config/config.js";
import { GATEWAY_CLIENT_IDS, GATEWAY_CLIENT_MODES } from "../../gateway/protocol/client-info.js";
import { normalizeTargetForProvider } from "../../infra/outbound/target-normalization.js";
import { getToolResult, runMessageAction } from "../../infra/outbound/message-action-runner.js";
import { resolveSessionAgentId } from "../agent-scope.js";
import { normalizeAccountId } from "../../routing/session-key.js";
import { channelTargetSchema, channelTargetsSchema, stringEnum } from "../schema/typebox.js";
import { listChannelSupportedActions } from "../channel-tools.js";
import { normalizeMessageChannel } from "../../utils/message-channel.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";

const AllMessageActions = CHANNEL_MESSAGE_ACTION_NAMES;
function buildRoutingSchema() {
  return {
    channel: Type.Optional(
      Type.String({ description: "Channel provider (e.g., 'telegram', 'discord', 'slack')." }),
    ),
    target: Type.Optional(channelTargetSchema({ description: "Target channel/user id or name." })),
    targets: Type.Optional(channelTargetsSchema()),
    accountId: Type.Optional(Type.String({ description: "Account ID for multi-account setups." })),
    dryRun: Type.Optional(Type.Boolean({ description: "Simulate the action without sending." })),
  };
}

function buildSendSchema(options: { includeButtons: boolean; includeCards: boolean }) {
  const props: Record<string, unknown> = {
    message: Type.Optional(Type.String({ description: "Text message content to send." })),
    effectId: Type.Optional(
      Type.String({
        description: "Message effect name/id for sendWithEffect (e.g., invisible ink).",
      }),
    ),
    effect: Type.Optional(
      Type.String({ description: "Alias for effectId (e.g., invisible-ink, balloons)." }),
    ),
    media: Type.Optional(Type.String({ description: "URL or path to media file to attach." })),
    filename: Type.Optional(Type.String({ description: "Filename for the attachment." })),
    buffer: Type.Optional(
      Type.String({
        description: "Base64 payload for attachments (optionally a data: URL).",
      }),
    ),
    contentType: Type.Optional(
      Type.String({ description: "MIME content type of the attachment." }),
    ),
    mimeType: Type.Optional(
      Type.String({ description: "MIME type of the attachment (alias for contentType)." }),
    ),
    caption: Type.Optional(Type.String({ description: "Caption for media attachments." })),
    path: Type.Optional(Type.String({ description: "Local file path to attach." })),
    filePath: Type.Optional(
      Type.String({ description: "Local file path to attach (alias for path)." }),
    ),
    replyTo: Type.Optional(Type.String({ description: "Message ID to reply to." })),
    threadId: Type.Optional(Type.String({ description: "Thread/topic ID to send to." })),
    asVoice: Type.Optional(Type.Boolean({ description: "Send audio as a voice message bubble." })),
    silent: Type.Optional(Type.Boolean({ description: "Send without notification sound." })),
    quoteText: Type.Optional(
      Type.String({ description: "Quote text for Telegram reply_parameters." }),
    ),
    bestEffort: Type.Optional(
      Type.Boolean({ description: "Continue on partial failures (e.g., some targets failed)." }),
    ),
    gifPlayback: Type.Optional(
      Type.Boolean({ description: "Enable GIF autoplay for the attachment." }),
    ),
    buttons: Type.Optional(
      Type.Array(
        Type.Array(
          Type.Object({
            text: Type.String({ description: "Button label text." }),
            callback_data: Type.String({
              description: "Callback data sent when button is pressed.",
            }),
          }),
        ),
        {
          description: "Telegram inline keyboard buttons (array of button rows).",
        },
      ),
    ),
    card: Type.Optional(
      Type.Object(
        {},
        {
          additionalProperties: true,
          description: "Adaptive Card JSON object (when supported by the channel).",
        },
      ),
    ),
  };
  if (!options.includeButtons) delete props.buttons;
  if (!options.includeCards) delete props.card;
  return props;
}

function buildReactionSchema() {
  return {
    messageId: Type.Optional(Type.String({ description: "Message ID to react to." })),
    emoji: Type.Optional(Type.String({ description: "Emoji character or name for the reaction." })),
    remove: Type.Optional(Type.Boolean({ description: "Remove the reaction instead of adding." })),
    targetAuthor: Type.Optional(
      Type.String({ description: "Author of the message to react to (Signal)." }),
    ),
    targetAuthorUuid: Type.Optional(
      Type.String({ description: "UUID of the message author (Signal)." }),
    ),
    groupId: Type.Optional(Type.String({ description: "Group ID for group reactions (Signal)." })),
  };
}

function buildFetchSchema() {
  return {
    limit: Type.Optional(Type.Number({ description: "Maximum number of messages to fetch." })),
    before: Type.Optional(Type.String({ description: "Fetch messages before this message ID." })),
    after: Type.Optional(Type.String({ description: "Fetch messages after this message ID." })),
    around: Type.Optional(Type.String({ description: "Fetch messages around this message ID." })),
    fromMe: Type.Optional(Type.Boolean({ description: "Filter to only messages from the bot." })),
    includeArchived: Type.Optional(
      Type.Boolean({ description: "Include archived messages in results." }),
    ),
  };
}

function buildPollSchema() {
  return {
    pollQuestion: Type.Optional(Type.String({ description: "Poll question text." })),
    pollOption: Type.Optional(
      Type.Array(Type.String(), { description: "Array of poll answer options." }),
    ),
    pollDurationHours: Type.Optional(
      Type.Number({ description: "Poll duration in hours before closing." }),
    ),
    pollMulti: Type.Optional(Type.Boolean({ description: "Allow multiple answer selections." })),
  };
}

function buildChannelTargetSchema() {
  return {
    channelId: Type.Optional(
      Type.String({ description: "Channel ID filter (search/thread list/event create)." }),
    ),
    channelIds: Type.Optional(
      Type.Array(Type.String(), { description: "Multiple channel IDs to filter by." }),
    ),
    guildId: Type.Optional(Type.String({ description: "Discord server/guild ID." })),
    userId: Type.Optional(Type.String({ description: "User ID to filter by." })),
    authorId: Type.Optional(Type.String({ description: "Message author ID to filter by." })),
    authorIds: Type.Optional(
      Type.Array(Type.String(), { description: "Multiple author IDs to filter by." }),
    ),
    roleId: Type.Optional(Type.String({ description: "Discord role ID to filter by." })),
    roleIds: Type.Optional(
      Type.Array(Type.String(), { description: "Multiple role IDs to filter by." }),
    ),
    participant: Type.Optional(Type.String({ description: "Participant ID/name to filter by." })),
  };
}

function buildStickerSchema() {
  return {
    emojiName: Type.Optional(Type.String({ description: "Emoji name to convert to sticker." })),
    stickerId: Type.Optional(Type.Array(Type.String(), { description: "Sticker IDs to send." })),
    stickerName: Type.Optional(Type.String({ description: "Name for creating a new sticker." })),
    stickerDesc: Type.Optional(Type.String({ description: "Description for the sticker." })),
    stickerTags: Type.Optional(Type.String({ description: "Tags/keywords for the sticker." })),
  };
}

function buildThreadSchema() {
  return {
    threadName: Type.Optional(Type.String({ description: "Name for creating a new thread." })),
    autoArchiveMin: Type.Optional(
      Type.Number({ description: "Minutes of inactivity before auto-archiving the thread." }),
    ),
  };
}

function buildEventSchema() {
  return {
    query: Type.Optional(Type.String({ description: "Search query for events." })),
    eventName: Type.Optional(Type.String({ description: "Event name/title." })),
    eventType: Type.Optional(Type.String({ description: "Event type (e.g., 'meeting', 'call')." })),
    startTime: Type.Optional(
      Type.String({ description: "Event start time (ISO 8601 or natural language)." }),
    ),
    endTime: Type.Optional(
      Type.String({ description: "Event end time (ISO 8601 or natural language)." }),
    ),
    desc: Type.Optional(Type.String({ description: "Event description." })),
    location: Type.Optional(
      Type.String({ description: "Event location (physical address or URL)." }),
    ),
    durationMin: Type.Optional(Type.Number({ description: "Event duration in minutes." })),
    until: Type.Optional(Type.String({ description: "End date for recurring events." })),
  };
}

function buildModerationSchema() {
  return {
    reason: Type.Optional(
      Type.String({ description: "Reason for moderation action (logged/displayed)." }),
    ),
    deleteDays: Type.Optional(
      Type.Number({ description: "Number of days of messages to delete (ban action)." }),
    ),
  };
}

function buildGatewaySchema() {
  return {
    gatewayUrl: Type.Optional(
      Type.String({ description: "Gateway URL override (uses default if omitted)." }),
    ),
    gatewayToken: Type.Optional(Type.String({ description: "Gateway authentication token." })),
    timeoutMs: Type.Optional(Type.Number({ description: "Request timeout in milliseconds." })),
  };
}

function buildChannelManagementSchema() {
  return {
    name: Type.Optional(Type.String({ description: "Channel name." })),
    type: Type.Optional(
      Type.Number({ description: "Channel type (Discord channel type number)." }),
    ),
    parentId: Type.Optional(Type.String({ description: "Parent category ID for the channel." })),
    topic: Type.Optional(Type.String({ description: "Channel topic/description." })),
    position: Type.Optional(Type.Number({ description: "Channel position in the list." })),
    nsfw: Type.Optional(Type.Boolean({ description: "Mark channel as NSFW (age-restricted)." })),
    rateLimitPerUser: Type.Optional(
      Type.Number({ description: "Slowmode delay in seconds between messages." }),
    ),
    categoryId: Type.Optional(Type.String({ description: "Category ID to move the channel to." })),
    clearParent: Type.Optional(
      Type.Boolean({
        description: "Clear the parent/category when supported by the provider.",
      }),
    ),
  };
}

function buildMessageToolSchemaProps(options: { includeButtons: boolean; includeCards: boolean }) {
  return {
    ...buildRoutingSchema(),
    ...buildSendSchema(options),
    ...buildReactionSchema(),
    ...buildFetchSchema(),
    ...buildPollSchema(),
    ...buildChannelTargetSchema(),
    ...buildStickerSchema(),
    ...buildThreadSchema(),
    ...buildEventSchema(),
    ...buildModerationSchema(),
    ...buildGatewaySchema(),
    ...buildChannelManagementSchema(),
  };
}

function buildMessageToolSchemaFromActions(
  actions: readonly string[],
  options: { includeButtons: boolean; includeCards: boolean },
) {
  const props = buildMessageToolSchemaProps(options);
  return Type.Object({
    action: stringEnum(actions),
    ...props,
  });
}

const MessageToolSchema = buildMessageToolSchemaFromActions(AllMessageActions, {
  includeButtons: true,
  includeCards: true,
});

type MessageToolOptions = {
  agentAccountId?: string;
  agentSessionKey?: string;
  config?: MoltbotConfig;
  currentChannelId?: string;
  currentChannelProvider?: string;
  currentThreadTs?: string;
  replyToMode?: "off" | "first" | "all";
  hasRepliedRef?: { value: boolean };
};

function buildMessageToolSchema(cfg: MoltbotConfig) {
  const actions = listChannelMessageActions(cfg);
  const includeButtons = supportsChannelMessageButtons(cfg);
  const includeCards = supportsChannelMessageCards(cfg);
  return buildMessageToolSchemaFromActions(actions.length > 0 ? actions : ["send"], {
    includeButtons,
    includeCards,
  });
}

function resolveAgentAccountId(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return normalizeAccountId(trimmed);
}

function filterActionsForContext(params: {
  actions: ChannelMessageActionName[];
  channel?: string;
  currentChannelId?: string;
}): ChannelMessageActionName[] {
  const channel = normalizeMessageChannel(params.channel);
  if (!channel || channel !== "bluebubbles") return params.actions;
  const currentChannelId = params.currentChannelId?.trim();
  if (!currentChannelId) return params.actions;
  const normalizedTarget =
    normalizeTargetForProvider(channel, currentChannelId) ?? currentChannelId;
  const lowered = normalizedTarget.trim().toLowerCase();
  const isGroupTarget =
    lowered.startsWith("chat_guid:") ||
    lowered.startsWith("chat_id:") ||
    lowered.startsWith("chat_identifier:") ||
    lowered.startsWith("group:");
  if (isGroupTarget) return params.actions;
  return params.actions.filter((action) => !BLUEBUBBLES_GROUP_ACTIONS.has(action));
}

function buildMessageToolDescription(options?: {
  config?: MoltbotConfig;
  currentChannel?: string;
  currentChannelId?: string;
}): string {
  const baseDescription = "Send, delete, and manage messages via channel plugins.";

  // If we have a current channel, show only its supported actions
  if (options?.currentChannel) {
    const channelActions = filterActionsForContext({
      actions: listChannelSupportedActions({
        cfg: options.config,
        channel: options.currentChannel,
      }),
      channel: options.currentChannel,
      currentChannelId: options.currentChannelId,
    });
    if (channelActions.length > 0) {
      // Always include "send" as a base action
      const allActions = new Set(["send", ...channelActions]);
      const actionList = Array.from(allActions).sort().join(", ");
      return `${baseDescription} Current channel (${options.currentChannel}) supports: ${actionList}.`;
    }
  }

  // Fallback to generic description with all configured actions
  if (options?.config) {
    const actions = listChannelMessageActions(options.config);
    if (actions.length > 0) {
      return `${baseDescription} Supports actions: ${actions.join(", ")}.`;
    }
  }

  return `${baseDescription} Supports actions: send, delete, react, poll, pin, threads, and more.`;
}

export function createMessageTool(options?: MessageToolOptions): AnyAgentTool {
  const agentAccountId = resolveAgentAccountId(options?.agentAccountId);
  const schema = options?.config ? buildMessageToolSchema(options.config) : MessageToolSchema;
  const description = buildMessageToolDescription({
    config: options?.config,
    currentChannel: options?.currentChannelProvider,
    currentChannelId: options?.currentChannelId,
  });

  return {
    label: "Message",
    name: "message",
    description,
    parameters: schema,
    execute: async (_toolCallId, args, signal) => {
      // Check if already aborted before doing any work
      if (signal?.aborted) {
        const err = new Error("Message send aborted");
        err.name = "AbortError";
        throw err;
      }
      const params = args as Record<string, unknown>;
      const cfg = options?.config ?? loadConfig();
      const action = readStringParam(params, "action", {
        required: true,
      }) as ChannelMessageActionName;

      const accountId = readStringParam(params, "accountId") ?? agentAccountId;
      if (accountId) {
        params.accountId = accountId;
      }

      const gateway = {
        url: readStringParam(params, "gatewayUrl", { trim: false }),
        token: readStringParam(params, "gatewayToken", { trim: false }),
        timeoutMs: readNumberParam(params, "timeoutMs"),
        clientName: GATEWAY_CLIENT_IDS.GATEWAY_CLIENT,
        clientDisplayName: "agent",
        mode: GATEWAY_CLIENT_MODES.BACKEND,
      };

      const toolContext =
        options?.currentChannelId ||
        options?.currentChannelProvider ||
        options?.currentThreadTs ||
        options?.replyToMode ||
        options?.hasRepliedRef
          ? {
              currentChannelId: options?.currentChannelId,
              currentChannelProvider: options?.currentChannelProvider,
              currentThreadTs: options?.currentThreadTs,
              replyToMode: options?.replyToMode,
              hasRepliedRef: options?.hasRepliedRef,
              // Direct tool invocations should not add cross-context decoration.
              // The agent is composing a message, not forwarding from another chat.
              skipCrossContextDecoration: true,
            }
          : undefined;

      const result = await runMessageAction({
        cfg,
        action,
        params,
        defaultAccountId: accountId ?? undefined,
        gateway,
        toolContext,
        agentId: options?.agentSessionKey
          ? resolveSessionAgentId({ sessionKey: options.agentSessionKey, config: cfg })
          : undefined,
        abortSignal: signal,
      });

      const toolResult = getToolResult(result);
      if (toolResult) return toolResult;
      return jsonResult(result.payload);
    },
  };
}
