import type { SlackEventMiddlewareArgs } from "@slack/bolt";
import type { SlackMonitorContext } from "../context.js";
import { danger, logVerbose } from "../../../globals.js";
import { VERSION } from "../../../version.js";

/** @internal Exported for testing only. */
export function buildHomeTabBlocks(params: {
  botUserId: string;
  slashCommand?: string;
}): Record<string, unknown>[] {
  const cmd = params.slashCommand ?? "/openclaw";
  return [
    {
      type: "header",
      text: { type: "plain_text", text: "OpenClaw", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Version:*\n\`${VERSION}\`` },
        { type: "mrkdwn", text: `*Bot:*\n<@${params.botUserId}>` },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Getting Started*\nSend me a DM or mention me in a channel to start a conversation.",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          "*Slash Commands*",
          `• \`${cmd}\` — Main command`,
          `• \`${cmd} status\` — Check status`,
          `• \`${cmd} help\` — Show help`,
        ].join("\n"),
      },
    },
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "<https://docs.openclaw.ai|Docs> · <https://github.com/openclaw/openclaw|GitHub> · <https://discord.com/invite/clawd|Community>",
        },
      ],
    },
  ];
}

/**
 * Simple per-user publish cache to avoid redundant views.publish calls
 * when the view hasn't changed. Keyed by userId, value is the VERSION
 * string at publish time. Cleared on process restart (which is fine —
 * a fresh publish after restart is desirable).
 */
const publishedVersionByUser = new Map<string, string>();

export function registerSlackHomeTabEvents(params: { ctx: SlackMonitorContext }) {
  const { ctx } = params;

  ctx.app.event(
    "app_home_opened",
    async ({ event, body }: SlackEventMiddlewareArgs<"app_home_opened">) => {
      try {
        if (ctx.shouldDropMismatchedSlackEvent(body)) {
          return;
        }

        // Only handle the "home" tab (not "messages")
        if (event.tab !== "home") {
          return;
        }

        if (!ctx.botUserId) {
          logVerbose("slack: skipping home tab publish — botUserId not available");
          return;
        }

        // Skip re-publish if this user already has the current version rendered
        const userId = event.user;
        if (publishedVersionByUser.get(userId) === VERSION) {
          logVerbose(`slack: home tab already published for ${userId}, skipping`);
          return;
        }

        const blocks = buildHomeTabBlocks({
          botUserId: ctx.botUserId,
          slashCommand: ctx.slashCommand.name ? `/${ctx.slashCommand.name}` : undefined,
        });

        await ctx.app.client.views.publish({
          token: ctx.botToken,
          user_id: userId,
          view: {
            type: "home",
            blocks,
          },
        });

        publishedVersionByUser.set(userId, VERSION);
      } catch (err) {
        ctx.runtime.error?.(danger(`slack app_home_opened handler failed: ${String(err)}`));
      }
    },
  );
}
