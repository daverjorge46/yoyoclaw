"use client";

import * as React from "react";
import { Settings2, Shield, Monitor, AlertCircle, Check, Loader2, Download, AlertTriangle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { channelIconMap, channelColorMap } from "./icons";
import type { ChannelConfig, ChannelStatus, PlatformType } from "./types";

interface ChannelCardProps {
  channel: ChannelConfig;
  currentPlatform?: PlatformType;
  onConfigure: () => void;
  className?: string;
}

const statusConfig: Record<
  ChannelStatus,
  { label: string; variant: "success" | "secondary" | "error" | "warning"; icon: React.ReactNode }
> = {
  connected: {
    label: "Connected",
    variant: "success",
    icon: <Check className="h-3 w-3" />,
  },
  not_configured: {
    label: "Not configured",
    variant: "secondary",
    icon: null,
  },
  error: {
    label: "Error",
    variant: "error",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  connecting: {
    label: "Connecting",
    variant: "warning",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  unsupported: {
    label: "Unsupported",
    variant: "secondary",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function isPlatformSupported(supported: PlatformType[], current: PlatformType): boolean {
  return supported.includes("any") || supported.includes(current);
}

export function ChannelCard({ channel, currentPlatform = "any", onConfigure, className }: ChannelCardProps) {
  const IconComponent = channelIconMap[channel.id];
  const channelColor = channelColorMap[channel.id];

  // Determine if the channel is supported on current platform
  const isSupported = channel.platform
    ? isPlatformSupported(channel.platform.supported, currentPlatform)
    : true;

  // Override status if unsupported
  const effectiveStatus = isSupported ? channel.status : "unsupported";
  const status = statusConfig[effectiveStatus];

  // Check if installation is required
  const requiresInstallation = channel.platform?.requiresInstallation;
  const requiresMacServer = channel.platform?.requiresMacServer;
  const hasRelayProviders = channel.platform?.relayProviders && channel.platform.relayProviders.length > 0;

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30",
          effectiveStatus === "connected" && "border-success/30",
          effectiveStatus === "error" && "border-error/30",
          effectiveStatus === "unsupported" && "border-muted opacity-75",
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Header: Icon + Name + Status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                    effectiveStatus === "unsupported" && "opacity-50"
                  )}
                  style={{ backgroundColor: `${channelColor}20` }}
                >
                  <IconComponent className="h-5 w-5" style={{ color: channelColor }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">{channel.name}</h3>
                    {channel.isAdvanced && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Advanced setup required</TooltipContent>
                      </Tooltip>
                    )}
                    {channel.localOnly && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Local machine only</TooltipContent>
                      </Tooltip>
                    )}
                    {requiresInstallation && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Requires installation: {channel.platform?.installationApp}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {requiresMacServer && currentPlatform !== "macos" && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        </TooltipTrigger>
                        <TooltipContent>Requires Mac server</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
                </div>
              </div>
            </div>

            {/* Platform badges */}
            {channel.platform && (
              <div className="flex flex-wrap items-center gap-1.5">
                {channel.platform.supported.map((platform) => (
                  <Badge
                    key={platform}
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      platform === currentPlatform && "border-primary/50 bg-primary/5"
                    )}
                  >
                    {platform === "any" ? "All Platforms" : platform}
                  </Badge>
                ))}
                {requiresInstallation && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/50 text-warning">
                    Install Required
                  </Badge>
                )}
              </div>
            )}

            {/* Footer: Status + Configure Button */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Badge variant={status.variant} className="gap-1">
                {status.icon}
                {status.label}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={onConfigure}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
                {effectiveStatus === "connected"
                  ? "Settings"
                  : effectiveStatus === "unsupported"
                    ? hasRelayProviders
                      ? "Options"
                      : "Info"
                    : "Configure"}
              </Button>
            </div>

            {/* Status message (error or info) */}
            {channel.statusMessage && (
              <p
                className={cn(
                  "text-xs",
                  effectiveStatus === "error" ? "text-error" : "text-muted-foreground"
                )}
              >
                {channel.statusMessage}
              </p>
            )}

            {/* Last connected */}
            {effectiveStatus === "connected" && channel.lastConnected && (
              <p className="text-xs text-muted-foreground">
                Connected {channel.lastConnected}
              </p>
            )}

            {/* Unsupported platform message */}
            {effectiveStatus === "unsupported" && (
              <p className="text-xs text-muted-foreground">
                {hasRelayProviders
                  ? "Not available on this platform. Alternative options available."
                  : `Only available on: ${channel.platform?.supported.join(", ")}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
