"use client";

import { MessageSquare, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelConfig } from "@/components/domain/config";

interface ChannelsSectionProps {
  className?: string;
}

export function ChannelsSection({ className }: ChannelsSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Messaging Channels
          </CardTitle>
          <CardDescription>
            Connect your messaging platforms to communicate with your AI agents.
            Messages from connected channels are routed to your configured agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Info box */}
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Getting Started</p>
              <ul className="text-muted-foreground space-y-1">
                <li>
                  <strong>Telegram</strong> - Create a bot via @BotFather and paste the token
                </li>
                <li>
                  <strong>Discord</strong> - Create a bot in Discord Developer Portal
                </li>
                <li>
                  <strong>WhatsApp</strong> - Scan QR code with your WhatsApp app
                </li>
                <li>
                  <strong>Slack</strong> - Install the Clawdbrain app to your workspace
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Config Grid */}
      <ChannelConfig />
    </div>
  );
}

export default ChannelsSection;
