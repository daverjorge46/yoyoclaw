import { ZohoCliqTokenResponse } from "./types.js";

const DC_URLS: Record<string, string> = {
    US: "https://accounts.zoho.com",
    EU: "https://accounts.zoho.eu",
    IN: "https://accounts.zoho.in",
    AU: "https://accounts.zoho.com.au",
    JP: "https://accounts.zoho.jp",
    CN: "https://accounts.zoho.com.cn",
    SA: "https://accounts.zoho.sa",
    UK: "https://accounts.zoho.uk",
    CA: "https://accounts.zohocloud.ca",
};

export async function refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    dc: string = "US",
    scope: string = "ZohoCliq.Messages.CREATE,ZohoCliq.Channels.READ"
): Promise<string> {
    const baseUrl = DC_URLS[dc] || DC_URLS["US"];
    const url = `${baseUrl}/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&scope=${encodeURIComponent(scope)}`;

    const response = await fetch(url, {
        method: "POST",
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to refresh Zoho Cliq token: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = (await response.json()) as ZohoCliqTokenResponse;
    if (data.error) {
        throw new Error(`Zoho Cliq token refresh error: ${data.error}`);
    }

    return data.access_token;
}
