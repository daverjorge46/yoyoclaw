
export interface ZohoCliqConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    dc: string;
}

export interface ZohoCliqTokenResponse {
    access_token: string;
    expires_in: number;
    api_domain: string;
    token_type: string;
    error?: string;
}

export interface ZohoCliqMessage {
    text: string;
    bot?: {
        name: string;
        image: string;
    };
    card?: {
        title: string;
        theme: string;
    };
    slides?: Array<{
        type: string;
        title: string;
        data: Array<{
            [key: string]: string;
        }>;
    }>;
}

// Webhook payload from Zoho Cliq (partial)
export interface ZohoCliqWebhookPayload {
    user: {
        id: string; // ZUID
        first_name: string;
        last_name: string;
        email: string;
        display_name: string;
    };
    channel?: {
        id: string;
        name: string;
    };
    message?: {
        text: string;
        id: string; // message id
        time: string; // timestamp
    };
    // DMs might have different structure or just 'user' and 'message'
    chat?: {
        id: string; // chat id for DM
    };
    text?: string; // Sometimes text is top level in slash commands
}
