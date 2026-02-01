"use client";

import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  ChannelCard,
  TelegramConfigSheet,
  DiscordConfigSheet,
  WhatsAppConfigSheet,
  SlackConfigSheet,
  SignalConfigSheet,
  iMessageConfigSheet as IMessageConfigSheet,
  GenericChannelConfigDialog,
  type ChannelConfig as ChannelConfigType,
  type ChannelId,
  type TelegramConfig,
  type DiscordConfig,
  type SlackConfig,
  type WhatsAppConfig,
  type SignalConfig,
  type PlatformType,
  MAC_RELAY_PROVIDERS,
} from "./channels";

interface ChannelConfigProps {
  className?: string;
  /** Current platform the gateway is running on */
  currentPlatform?: PlatformType;
}

const defaultChannels: ChannelConfigType[] = [
  // Messaging category
  {
    id: "telegram",
    name: "Telegram",
    description: "Bot token authentication",
    status: "not_configured",
    category: "messaging",
    platform: { supported: ["any"] },
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "QR code pairing",
    status: "not_configured",
    category: "messaging",
    platform: { supported: ["any"] },
  },
  {
    id: "discord",
    name: "Discord",
    description: "Bot token authentication",
    status: "not_configured",
    category: "messaging",
    platform: { supported: ["any"] },
  },
  {
    id: "signal",
    name: "Signal",
    description: "Secure messaging",
    status: "not_configured",
    isAdvanced: true,
    category: "messaging",
    platform: {
      supported: ["any"],
      requiresInstallation: true,
      installationApp: "signal-cli",
      installationUrl: "https://docs.clawdbrain.bot/channels/signal",
    },
  },
  {
    id: "imessage",
    name: "iMessage",
    description: "macOS native messaging",
    status: "not_configured",
    localOnly: true,
    category: "messaging",
    platform: {
      supported: ["macos"],
      requiresInstallation: true,
      installationApp: "imsg",
      installationUrl: "https://github.com/steipete/imsg",
      relayProviders: MAC_RELAY_PROVIDERS,
    },
  },
  {
    id: "bluebubbles",
    name: "BlueBubbles",
    description: "Enhanced iMessage bridge",
    status: "not_configured",
    category: "messaging",
    platform: {
      supported: ["any"],
      requiresMacServer: true,
      requiresInstallation: true,
      installationApp: "BlueBubbles Server",
      installationUrl: "https://bluebubbles.app/",
    },
  },
  {
    id: "line",
    name: "LINE",
    description: "Popular in Asia",
    status: "not_configured",
    category: "messaging",
    platform: { supported: ["any"] },
  },
  // Enterprise category
  {
    id: "slack",
    name: "Slack",
    description: "Workspace connection",
    status: "not_configured",
    category: "enterprise",
    platform: { supported: ["any"] },
  },
  {
    id: "msteams",
    name: "Microsoft Teams",
    description: "Enterprise messaging",
    status: "not_configured",
    category: "enterprise",
    platform: { supported: ["any"] },
  },
  {
    id: "googlechat",
    name: "Google Chat",
    description: "Google Workspace",
    status: "not_configured",
    category: "enterprise",
    platform: { supported: ["any"] },
  },
  {
    id: "mattermost",
    name: "Mattermost",
    description: "Self-hosted team chat",
    status: "not_configured",
    category: "enterprise",
    platform: { supported: ["any"] },
  },
  // Decentralized category
  {
    id: "matrix",
    name: "Matrix",
    description: "Decentralized protocol",
    status: "not_configured",
    category: "decentralized",
    platform: { supported: ["any"] },
  },
  // Productivity category
  {
    id: "notion",
    name: "Notion",
    description: "Workspace integration",
    status: "not_configured",
    category: "productivity",
    platform: { supported: ["any"] },
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Local knowledge base",
    status: "not_configured",
    category: "productivity",
    platform: {
      supported: ["any"],
      requiresInstallation: true,
      installationApp: "Obsidian Local REST API",
      installationUrl: "https://github.com/coddingtonbear/obsidian-local-rest-api",
    },
  },
];

// Channel-specific field configs
const channelFieldConfigs: Record<string, { fields: Array<{ name: string; label: string; placeholder: string; type?: "text" | "password" | "url"; helpText?: string }>; helpSteps: string[]; docsUrl?: string }> = {
  msteams: {
    fields: [
      { name: "tenantId", label: "Tenant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", helpText: "Your Azure AD tenant ID" },
      { name: "clientId", label: "Client ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
      { name: "clientSecret", label: "Client Secret", placeholder: "Your client secret", type: "password" },
      { name: "botId", label: "Bot ID (optional)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
    ],
    helpSteps: [
      "Go to Azure Portal and create a new App Registration",
      "Configure the Bot Channel Registration",
      "Add Microsoft Teams channel to your bot",
      "Copy the Tenant ID, Client ID, and create a Client Secret",
      "Paste the credentials above",
    ],
    docsUrl: "https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/create-a-bot-for-teams",
  },
  googlechat: {
    fields: [
      { name: "webhookUrl", label: "Webhook URL (optional)", placeholder: "https://chat.googleapis.com/v1/spaces/...", type: "url" },
      { name: "serviceAccountKey", label: "Service Account Key", placeholder: "Paste JSON key content", helpText: "Full JSON key from Google Cloud Console" },
    ],
    helpSteps: [
      "Go to Google Cloud Console",
      "Create a new project or select existing",
      "Enable the Google Chat API",
      "Create a Service Account with Chat permissions",
      "Download the JSON key and paste it above",
    ],
    docsUrl: "https://developers.google.com/chat/api/guides/auth/service-accounts",
  },
  line: {
    fields: [
      { name: "channelAccessToken", label: "Channel Access Token", placeholder: "Your LINE channel access token", type: "password" },
      { name: "channelSecret", label: "Channel Secret", placeholder: "Your LINE channel secret", type: "password" },
    ],
    helpSteps: [
      "Go to LINE Developers Console",
      "Create a new Messaging API channel",
      "Navigate to the Messaging API tab",
      "Copy the Channel Access Token and Channel Secret",
      "Paste the credentials above",
    ],
    docsUrl: "https://developers.line.biz/en/docs/messaging-api/getting-started/",
  },
  matrix: {
    fields: [
      { name: "homeserverUrl", label: "Homeserver URL", placeholder: "https://matrix.org", type: "url" },
      { name: "accessToken", label: "Access Token", placeholder: "Your Matrix access token", type: "password" },
      { name: "userId", label: "User ID", placeholder: "@bot:matrix.org" },
    ],
    helpSteps: [
      "Create a Matrix account on any homeserver (e.g., matrix.org)",
      "Log in using the Element web client or CLI",
      "Get your access token from Settings → Help & About → Advanced",
      "Paste the homeserver URL, token, and user ID above",
    ],
    docsUrl: "https://matrix.org/docs/guides/client-server-api/",
  },
  bluebubbles: {
    fields: [
      { name: "serverUrl", label: "Server URL", placeholder: "http://localhost:1234", type: "url", helpText: "URL of your BlueBubbles Mac server" },
      { name: "password", label: "Server Password", placeholder: "Your BlueBubbles password", type: "password" },
    ],
    helpSteps: [
      "Install BlueBubbles Server on a Mac with iMessage configured",
      "Set up the server and note the URL (use Ngrok for remote access)",
      "Copy the server password from BlueBubbles settings",
      "Enter the URL and password above",
    ],
    docsUrl: "https://bluebubbles.app/install/",
  },
  mattermost: {
    fields: [
      { name: "serverUrl", label: "Server URL", placeholder: "https://your-mattermost.example.com", type: "url" },
      { name: "botToken", label: "Bot Token", placeholder: "Your Mattermost bot token", type: "password" },
    ],
    helpSteps: [
      "Log in to your Mattermost server as an admin",
      "Go to Integrations → Bot Accounts → Add Bot Account",
      "Create a bot and copy the access token",
      "Enter the server URL and token above",
    ],
    docsUrl: "https://docs.mattermost.com/integrations/cloud-bot-accounts.html",
  },
  notion: {
    fields: [
      { name: "integrationToken", label: "Integration Token", placeholder: "secret_xxxxx", type: "password", helpText: "Internal integration token from Notion" },
    ],
    helpSteps: [
      "Go to Notion Integrations page (notion.so/my-integrations)",
      "Create a new integration",
      "Copy the Internal Integration Token",
      "Share the pages/databases you want to access with your integration",
      "Paste the token above",
    ],
    docsUrl: "https://developers.notion.com/docs/getting-started",
  },
  obsidian: {
    fields: [
      { name: "vaultPath", label: "Vault Path", placeholder: "/path/to/your/vault" },
      { name: "apiKey", label: "API Key (if using REST API)", placeholder: "Your API key", type: "password" },
    ],
    helpSteps: [
      "Install the Obsidian Local REST API plugin",
      "Enable the plugin in Obsidian settings",
      "Copy the API key from the plugin settings",
      "Enter your vault path and API key above",
    ],
    docsUrl: "https://github.com/coddingtonbear/obsidian-local-rest-api",
  },
};

export function ChannelConfig({ className, currentPlatform = "macos" }: ChannelConfigProps) {
  const [channels, setChannels] = React.useState<ChannelConfigType[]>(defaultChannels);
  const [activeSheet, setActiveSheet] = React.useState<ChannelId | null>(null);

  // Channel-specific config state
  const [telegramConfig, setTelegramConfig] = React.useState<TelegramConfig>();
  const [discordConfig, setDiscordConfig] = React.useState<DiscordConfig>();
  const [whatsappConfig, setWhatsappConfig] = React.useState<WhatsAppConfig>();
  const [slackConfig, setSlackConfig] = React.useState<SlackConfig>();
  const [signalConfig, setSignalConfig] = React.useState<SignalConfig>();
  const [, setGenericConfigs] = React.useState<Record<string, Record<string, string>>>({});

  const updateChannelStatus = (
    channelId: ChannelId,
    status: ChannelConfigType["status"],
    statusMessage?: string,
    lastConnected?: string
  ) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === channelId
          ? { ...ch, status, statusMessage, lastConnected }
          : ch
      )
    );
  };

  const getChannelStatus = (channelId: ChannelId) => {
    return channels.find((ch) => ch.id === channelId)?.status;
  };

  const getChannel = (channelId: ChannelId) => {
    return channels.find((ch) => ch.id === channelId);
  };

  // Check if a channel is supported on current platform
  const isChannelSupported = (channel: ChannelConfigType) => {
    if (!channel.platform) return true;
    return channel.platform.supported.includes("any") || channel.platform.supported.includes(currentPlatform);
  };

  // Telegram handlers
  const handleTelegramSave = async (config: TelegramConfig) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setTelegramConfig(config);
    updateChannelStatus("telegram", "connected", undefined, "just now");
    toast.success("Telegram connected successfully");
  };

  const handleTelegramDisconnect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setTelegramConfig(undefined);
    updateChannelStatus("telegram", "not_configured");
    toast.success("Telegram disconnected");
  };

  // Discord handlers
  const handleDiscordSave = async (config: DiscordConfig) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setDiscordConfig(config);
    updateChannelStatus("discord", "connected", undefined, "just now");
    toast.success("Discord connected successfully");
  };

  const handleDiscordDisconnect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDiscordConfig(undefined);
    updateChannelStatus("discord", "not_configured");
    toast.success("Discord disconnected");
  };

  // WhatsApp handlers
  const handleWhatsAppPairing = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setWhatsappConfig({ qrCode: "data:image/png;base64,placeholder" });
    updateChannelStatus("whatsapp", "connecting", "Waiting for QR scan...");
  };

  const handleWhatsAppDisconnect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setWhatsappConfig(undefined);
    updateChannelStatus("whatsapp", "not_configured");
    toast.success("WhatsApp disconnected");
  };

  // Slack handlers
  const handleSlackConnect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSlackConfig({ workspaceId: "T12345678", workspaceName: "My Workspace" });
    updateChannelStatus("slack", "connected", undefined, "just now");
    toast.success("Slack connected successfully");
  };

  const handleSlackDisconnect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSlackConfig(undefined);
    updateChannelStatus("slack", "not_configured");
    toast.success("Slack disconnected");
  };

  // Signal handlers
  const handleSignalSave = async (config: SignalConfig) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSignalConfig(config);
    updateChannelStatus("signal", "connected", undefined, "just now");
    toast.success("Signal connected successfully");
  };

  const handleSignalDisconnect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSignalConfig(undefined);
    updateChannelStatus("signal", "not_configured");
    toast.success("Signal disconnected");
  };

  // Generic handler for new channels
  const handleGenericSave = async (channelId: ChannelId, values: Record<string, string>) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setGenericConfigs((prev) => ({ ...prev, [channelId]: values }));
    updateChannelStatus(channelId, "connected", undefined, "just now");
  };

  const handleGenericDisconnect = async (channelId: ChannelId) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setGenericConfigs((prev) => {
      const updated = { ...prev };
      delete updated[channelId];
      return updated;
    });
    updateChannelStatus(channelId, "not_configured");
    toast.success(`${getChannel(channelId)?.name} disconnected`);
  };

  const openSheet = (channelId: ChannelId) => {
    setActiveSheet(channelId);
  };

  const closeSheet = () => {
    setActiveSheet(null);
  };

  // Group channels by category
  const channelsByCategory = React.useMemo(() => {
    const grouped: Record<string, ChannelConfigType[]> = {
      messaging: [],
      enterprise: [],
      decentralized: [],
      productivity: [],
    };
    channels.forEach((ch) => {
      const category = ch.category || "messaging";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(ch);
    });
    return grouped;
  }, [channels]);

  const categoryLabels: Record<string, string> = {
    messaging: "Messaging",
    enterprise: "Enterprise",
    decentralized: "Decentralized",
    productivity: "Productivity",
  };

  // Render generic dialogs for new channels
  const renderGenericDialogs = () => {
    const genericChannelIds: ChannelId[] = ["msteams", "googlechat", "line", "matrix", "bluebubbles", "mattermost", "notion", "obsidian"];

    return genericChannelIds.map((channelId) => {
      const channel = getChannel(channelId);
      if (!channel) return null;

      const config = channelFieldConfigs[channelId];
      const isSupported = isChannelSupported(channel);

      return (
        <GenericChannelConfigDialog
          key={channelId}
          open={activeSheet === channelId}
          onOpenChange={(open) => !open && closeSheet()}
          channel={channel}
          fields={config?.fields}
          helpSteps={config?.helpSteps}
          docsUrl={config?.docsUrl}
          isConnected={getChannelStatus(channelId) === "connected"}
          isUnsupported={!isSupported}
          relayProviders={channel.platform?.relayProviders}
          onSave={(values) => handleGenericSave(channelId, values)}
          onDisconnect={() => handleGenericDisconnect(channelId)}
        />
      );
    });
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Channels by category */}
      {Object.entries(channelsByCategory).map(([category, categoryChannels]) => (
        categoryChannels.length > 0 && (
          <div key={category} className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {categoryLabels[category]}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {categoryChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  currentPlatform={currentPlatform}
                  onConfigure={() => openSheet(channel.id)}
                />
              ))}
            </div>
          </div>
        )
      ))}

      {/* Existing Configuration Dialogs */}
      <TelegramConfigSheet
        open={activeSheet === "telegram"}
        onOpenChange={(open) => !open && closeSheet()}
        config={telegramConfig}
        onSave={handleTelegramSave}
        onDisconnect={handleTelegramDisconnect}
        isConnected={getChannelStatus("telegram") === "connected"}
      />

      <DiscordConfigSheet
        open={activeSheet === "discord"}
        onOpenChange={(open) => !open && closeSheet()}
        config={discordConfig}
        onSave={handleDiscordSave}
        onDisconnect={handleDiscordDisconnect}
        isConnected={getChannelStatus("discord") === "connected"}
      />

      <WhatsAppConfigSheet
        open={activeSheet === "whatsapp"}
        onOpenChange={(open) => !open && closeSheet()}
        config={whatsappConfig}
        onStartPairing={handleWhatsAppPairing}
        onDisconnect={handleWhatsAppDisconnect}
        isConnected={getChannelStatus("whatsapp") === "connected"}
      />

      <SlackConfigSheet
        open={activeSheet === "slack"}
        onOpenChange={(open) => !open && closeSheet()}
        config={slackConfig}
        onConnect={handleSlackConnect}
        onDisconnect={handleSlackDisconnect}
        isConnected={getChannelStatus("slack") === "connected"}
      />

      <SignalConfigSheet
        open={activeSheet === "signal"}
        onOpenChange={(open) => !open && closeSheet()}
        config={signalConfig}
        onSave={handleSignalSave}
        onDisconnect={handleSignalDisconnect}
        isConnected={getChannelStatus("signal") === "connected"}
      />

      <IMessageConfigSheet
        open={activeSheet === "imessage"}
        onOpenChange={(open) => !open && closeSheet()}
        isConnected={getChannelStatus("imessage") === "connected"}
        isMacOS={currentPlatform === "macos"}
      />

      {/* Generic dialogs for new channels */}
      {renderGenericDialogs()}
    </div>
  );
}

export default ChannelConfig;
