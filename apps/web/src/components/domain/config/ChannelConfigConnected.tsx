"use client";

import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, errorMessages } from "@/components/composed/ErrorState";
import {
  ChannelCard,
  TelegramConfigSheet,
  DiscordConfigSheet,
  WhatsAppConfigSheet,
  SlackConfigSheet,
  SignalConfigSheet,
  iMessageConfigSheet as IMessageConfigSheet,
  type ChannelConfig as ChannelConfigType,
  type ChannelId,
  type TelegramConfig,
  type DiscordConfig,
  type SlackConfig,
  type WhatsAppConfig,
  type SignalConfig,
} from "./channels";
import { useChannelsStatus } from "@/hooks/queries/useChannels";
import { useConfig } from "@/hooks/queries/useConfig";
import { usePatchConfig, useLogoutChannel } from "@/hooks/mutations/useConfigMutations";
import type { ChannelAccountSnapshot } from "@/lib/api";

interface ChannelConfigConnectedProps {
  className?: string;
  /** Whether to probe channels for real-time status */
  probe?: boolean;
}

/**
 * Map API channel status to UI channel status
 */
function mapChannelStatus(
  snapshot: ChannelAccountSnapshot | undefined
): ChannelConfigType["status"] {
  if (!snapshot) return "not_configured";
  if (snapshot.error) return "error";
  if (snapshot.connected) return "connected";
  if (snapshot.configured) return "not_configured"; // configured but not connected
  return "not_configured";
}

/**
 * Connected version of ChannelConfig that fetches data from the API.
 */
export function ChannelConfigConnected({
  className,
  probe = false,
}: ChannelConfigConnectedProps) {
  const {
    data: channelsData,
    isLoading: isChannelsLoading,
    error: channelsError,
    refetch: refetchChannels,
    isFetching: isChannelsFetching,
  } = useChannelsStatus({ probe });
  const { data: configSnapshot } = useConfig();
  const patchConfig = usePatchConfig();
  const logoutChannel = useLogoutChannel();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const [activeSheet, setActiveSheet] = React.useState<ChannelId | null>(null);

  // Build channel list from API data
  const channels: ChannelConfigType[] = React.useMemo(() => {
    if (!channelsData) {
      // Return default channels while loading
      return [
        { id: "telegram", name: "Telegram", description: "Bot token authentication", status: "not_configured" },
        { id: "whatsapp", name: "WhatsApp", description: "QR code pairing", status: "not_configured" },
        { id: "discord", name: "Discord", description: "Bot token authentication", status: "not_configured" },
        { id: "signal", name: "Signal", description: "Secure messaging", status: "not_configured", isAdvanced: true },
        { id: "slack", name: "Slack", description: "Workspace connection", status: "not_configured" },
        { id: "imessage", name: "iMessage", description: "macOS native messaging", status: "not_configured", localOnly: true },
      ];
    }

    const order = channelsData.channelOrder || [];
    const labels = channelsData.channelLabels || {};
    const meta = channelsData.channelMeta || {};
    const accounts = channelsData.channelAccounts || {};
    const defaultAccountIds = channelsData.channelDefaultAccountId || {};

    // Filter to supported channel IDs
    const supportedChannels: ChannelId[] = ["telegram", "whatsapp", "discord", "signal", "slack", "imessage"];

    return order
      .filter((id): id is ChannelId => supportedChannels.includes(id as ChannelId))
      .map((channelId) => {
        const channelMeta = meta[channelId];
        const channelAccounts = accounts[channelId] || [];
        const defaultAccountId = defaultAccountIds[channelId];
        const defaultAccount = channelAccounts.find((a) => a.accountId === defaultAccountId) || channelAccounts[0];

        return {
          id: channelId,
          name: labels[channelId] || channelMeta?.label || channelId,
          description: channelMeta?.blurb || "",
          status: mapChannelStatus(defaultAccount),
          statusMessage: defaultAccount?.statusMessage || defaultAccount?.error,
          lastConnected: defaultAccount?.lastInboundAt
            ? new Date(defaultAccount.lastInboundAt).toLocaleString()
            : undefined,
          isAdvanced: channelMeta?.advanced,
          localOnly: channelMeta?.localOnly,
        };
      });
  }, [channelsData]);

  // Channel-specific config from API
  const telegramConfig = React.useMemo((): TelegramConfig | undefined => {
    const cfg = configSnapshot?.config?.channels?.telegram;
    if (cfg?.botToken) return { botToken: cfg.botToken };
    return undefined;
  }, [configSnapshot]);

  const discordConfig = React.useMemo((): DiscordConfig | undefined => {
    const cfg = configSnapshot?.config?.channels?.discord;
    if (cfg?.botToken) return { botToken: cfg.botToken };
    return undefined;
  }, [configSnapshot]);

  const slackConfig = React.useMemo((): SlackConfig | undefined => {
    const cfg = configSnapshot?.config?.channels?.slack;
    if (cfg?.workspaceId) {
      return { workspaceId: cfg.workspaceId };
    }
    return undefined;
  }, [configSnapshot]);

  const whatsappConfig = React.useMemo((): WhatsAppConfig | undefined => {
    // WhatsApp uses QR pairing, check if configured
    const accounts = channelsData?.channelAccounts?.whatsapp;
    const defaultAccount = accounts?.[0];
    if (defaultAccount?.configured) {
      return {}; // WhatsApp doesn't store config, just pairing state
    }
    return undefined;
  }, [channelsData]);

  const signalConfig = React.useMemo((): SignalConfig | undefined => {
    const cfg = configSnapshot?.config?.channels?.signal;
    if (cfg?.phoneNumber) {
      return { phoneNumber: cfg.phoneNumber };
    }
    return undefined;
  }, [configSnapshot]);

  // Handlers
  const getChannelStatus = (channelId: ChannelId) => {
    return channels.find((ch) => ch.id === channelId)?.status;
  };

  const handleTelegramSave = async (config: TelegramConfig) => {
    if (!configSnapshot?.hash) return;
    await patchConfig.mutateAsync({
      baseHash: configSnapshot.hash,
      raw: JSON.stringify({
        channels: { telegram: { botToken: config.botToken, enabled: true } },
      }),
      note: "Configure Telegram",
    });
    toast.success("Telegram configured successfully");
    setActiveSheet(null);
  };

  const handleTelegramDisconnect = async () => {
    await logoutChannel.mutateAsync({ channel: "telegram" });
    setActiveSheet(null);
  };

  const handleDiscordSave = async (config: DiscordConfig) => {
    if (!configSnapshot?.hash) return;
    await patchConfig.mutateAsync({
      baseHash: configSnapshot.hash,
      raw: JSON.stringify({
        channels: { discord: { botToken: config.botToken, enabled: true } },
      }),
      note: "Configure Discord",
    });
    toast.success("Discord configured successfully");
    setActiveSheet(null);
  };

  const handleDiscordDisconnect = async () => {
    await logoutChannel.mutateAsync({ channel: "discord" });
    setActiveSheet(null);
  };

  const handleWhatsAppPairing = async () => {
    // WhatsApp pairing is handled by the gateway via QR code flow
    // The config sheet should show the QR code from the gateway
    toast.info("WhatsApp pairing requires gateway support");
  };

  const handleWhatsAppDisconnect = async () => {
    await logoutChannel.mutateAsync({ channel: "whatsapp" });
    setActiveSheet(null);
  };

  const handleSlackConnect = async () => {
    // Slack OAuth flow would be handled differently
    toast.info("Slack OAuth flow not yet implemented in web UI");
  };

  const handleSlackDisconnect = async () => {
    await logoutChannel.mutateAsync({ channel: "slack" });
    setActiveSheet(null);
  };

  const handleSignalSave = async (config: SignalConfig) => {
    if (!configSnapshot?.hash) return;
    await patchConfig.mutateAsync({
      baseHash: configSnapshot.hash,
      raw: JSON.stringify({
        channels: { signal: { phoneNumber: config.phoneNumber, enabled: true } },
      }),
      note: "Configure Signal",
    });
    toast.success("Signal configured successfully");
    setActiveSheet(null);
  };

  const handleSignalDisconnect = async () => {
    await logoutChannel.mutateAsync({ channel: "signal" });
    setActiveSheet(null);
  };

  const openSheet = (channelId: ChannelId) => {
    setActiveSheet(channelId);
  };

  const closeSheet = () => {
    setActiveSheet(null);
  };

  // Retry handler
  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true);
    try {
      await refetchChannels();
      toast.success("Channel status loaded successfully");
    } catch {
      // Error will be shown by ErrorState
    } finally {
      setIsRetrying(false);
    }
  }, [refetchChannels]);

  // Loading skeleton
  if (isChannelsLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (channelsError) {
    return (
      <div className={cn("space-y-4", className)}>
        <ErrorState
          variant="card"
          title={errorMessages.channels.title}
          description={errorMessages.channels.description}
          onRetry={handleRetry}
          isRetrying={isRetrying || isChannelsFetching}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Channel Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onConfigure={() => openSheet(channel.id)}
          />
        ))}
      </div>

      {/* Configuration Sheets */}
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
      />
    </div>
  );
}

export default ChannelConfigConnected;
