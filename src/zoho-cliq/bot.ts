import { refreshAccessToken } from "./auth.js";
import { ZohoCliqAccountConfig } from "../config/types.js";
import { getChildLogger } from "../logging.js";

const logger = getChildLogger({ module: "zoho-cliq-bot" });

export class ZohoCliqBot {
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(private config: ZohoCliqAccountConfig) { }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
            return this.accessToken;
        }

        if (!this.config.clientId || !this.config.clientSecret || !this.config.refreshToken) {
            throw new Error("Zoho Cliq OAuth credentials missing");
        }

        try {
            // TODO: Allow configuring scope via config if needed. 
            // For now, default to Messages.CREATE and Channels.READ as a safe baseline.
            const token = await refreshAccessToken(
                this.config.clientId,
                this.config.clientSecret,
                this.config.refreshToken,
                this.config.dc
            );
            this.accessToken = token;
            // Zoho Access tokens typically expire in 1 hour (3600 seconds).
            // Standardize on 55 minutes to be safe, or parse expires_in if functionality expands.
            this.tokenExpiresAt = Date.now() + (55 * 60 * 1000);
            return token;
        } catch (error) {
            logger.error({ err: error }, "Failed to refresh access token");
            throw error;
        }
    }

    async sendMessage(channelIdOrChatId: string, text: string) {
        const token = await this.getAccessToken();
        const dc = this.config.dc || "US";

        // Logic to determine API domain based on DC
        let apiDomain = "https://cliq.zoho.com";
        switch (dc) {
            case "EU": apiDomain = "https://cliq.zoho.eu"; break;
            case "IN": apiDomain = "https://cliq.zoho.in"; break;
            case "AU": apiDomain = "https://cliq.zoho.com.au"; break;
            case "JP": apiDomain = "https://cliq.zoho.jp"; break;
            case "CN": apiDomain = "https://cliq.zoho.com.cn"; break;
            case "SA": apiDomain = "https://cliq.zoho.sa"; break;
            case "UK": apiDomain = "https://cliq.zoho.uk"; break;
            case "CA": apiDomain = "https://cliq.zohocloud.ca"; break;
            default: apiDomain = "https://cliq.zoho.com"; break;
        }

        // Determine if target is a Chat ID or Channel Unique Name.
        // Heuristic: Chat IDs are typically numeric or specific UUID-like strings.
        // Channel unique names are user-defined strings.
        // For simplicity: unique names usually don't look like IDs.

        // However, the safer bet for V1 is sticking to the `chats` endpoint 
        // if we assume interactions start from a webhook (which gives a chat_id/channel_id).

        const url = `${apiDomain}/api/v2/chats/${channelIdOrChatId}/message`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            // Fallback for channels by unique name if 404/400?
            // If the chat_id approach fails, try the named channel endpoint.
            if (response.status === 404 || response.status === 400) {
                const channelUrl = `${apiDomain}/api/v2/channelsbyname/${channelIdOrChatId}/message`;
                const channelResponse = await fetch(channelUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Zoho-oauthtoken ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ text }),
                });
                if (channelResponse.ok) {
                    return channelResponse.json();
                }
            }

            const errText = await response.text();
            logger.error(`Failed to send message to ${channelIdOrChatId}: ${response.status} ${errText}`);
            throw new Error(`Failed to send message: ${errText}`);
        }

        return response.json();
    }
}
