import { createServer } from "node:http";
import { loadConfig } from "../config/config.js";
import { formatErrorMessage } from "../infra/errors.js";
import type { RuntimeEnv } from "../runtime.js";
import { readJsonBody } from "../gateway/hooks.js";
import { dispatchReplyFromConfig } from "../auto-reply/reply/dispatch-from-config.js";
import { createReplyDispatcherWithTyping } from "../auto-reply/reply/reply-dispatcher.js";
import { ZohoCliqBot } from "./bot.js";
import { ZohoCliqAccountConfig } from "../config/types.js";
import { danger } from "../globals.js";

type ZohoCliqWebhookOptions = {
    port?: number;
    runtime: RuntimeEnv;
    bot: ZohoCliqBot;
    accountId: string;
    config: ZohoCliqAccountConfig;
};

export async function startZohoCliqWebhook(opts: ZohoCliqWebhookOptions) {
    const { port = 8080, runtime, bot, accountId } = opts;

    const server = createServer(async (req, res) => {
        if (req.method !== "POST") {
            res.writeHead(405);
            res.end("Method Not Allowed");
            return;
        }

        try {
            const bodyResult = await readJsonBody(req, 1024 * 1024); // 1MB limit
            if (!bodyResult.ok) {
                res.writeHead(400);
                res.end(bodyResult.error);
                return;
            }

            const payload = bodyResult.value as any;

            // Basic Zoho Cliq Message handling
            // Note: Structure varies by event type (message, bot_mention, etc.)
            const text = payload.text || payload.message?.text || payload.content;
            const fromUser = payload.user || payload.from;
            const fromId = fromUser?.id || payload.user_id;
            const fromName = fromUser?.first_name || fromUser?.name || "Unknown";
            const channelId = payload.channel_id || payload.chat_id || fromId;

            if (!text || !fromId) {
                // Verify ping/handshake
                res.writeHead(200);
                res.end();
                return;
            }

            const cfg = loadConfig();

            const { dispatcher, replyOptions, markDispatchIdle } =
                createReplyDispatcherWithTyping({
                    responsePrefix: cfg.messages?.responsePrefix,
                    deliver: async (responsePayload, _info) => {
                        // TODO: Handle info.kind === "typing" if supported
                        if (responsePayload.text) {
                            await bot.sendMessage(channelId, responsePayload.text);
                        }
                    },
                    onError: (err, info) => {
                        runtime.error?.(danger(`zoho ${info.kind} reply failed: ${String(err)}`));
                    },
                });

            await dispatchReplyFromConfig({
                ctx: {
                    Provider: "zoho-cliq" as any, // Cast if type union is strict
                    Body: text,
                    From: `zoho:${fromId}`,
                    To: `zoho:bot`,
                    SessionKey: `zoho:${channelId}`,
                    AccountId: accountId,
                    SenderId: String(fromId),
                    SenderName: fromName,
                    // Timestamp: Date.now(), // Approximate - Timestamp might strictly not exist in MsgContext
                    // Fill required fields with defaults
                    ChangeType: "message",
                    MessageSid: String(Date.now()),
                    Surface: "zoho-cliq" as any,
                } as any,
                cfg,
                dispatcher,
                replyOptions,
            });

            markDispatchIdle();

            res.writeHead(200);
            res.end();

        } catch (err) {
            runtime.error?.(`Zoho webhook failed: ${formatErrorMessage(err)}`);
            res.writeHead(500);
            res.end();
        }
    });

    return new Promise<{ stop: () => Promise<void> }>((resolve, reject) => {
        server.listen(port, () => {
            runtime.log?.(`Zoho Cliq webhook listening on port ${port}`);
            resolve({
                stop: async () => {
                    return new Promise((r) => server.close(() => r()));
                }
            });
        });
        server.on('error', reject);
    });
}
