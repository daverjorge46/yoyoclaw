"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ExternalLink, CheckCircle2, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlackIcon } from "./icons";
import type { SlackConfig } from "./types";

type OAuthStatus = "idle" | "redirecting" | "connected" | "error";

interface SlackConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: SlackConfig;
  onConnect: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  isConnected?: boolean;
}

export function SlackConfigSheet({
  open,
  onOpenChange,
  config,
  onConnect,
  onDisconnect,
  isConnected,
}: SlackConfigSheetProps) {
  const [oauthStatus, setOauthStatus] = React.useState<OAuthStatus>("idle");
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  // Reset state when sheet opens
  React.useEffect(() => {
    if (open) {
      setOauthStatus("idle");
    }
  }, [open]);

  const handleConnect = async () => {
    setOauthStatus("redirecting");
    try {
      await onConnect();
      // In real implementation, the OAuth callback would update the status
      // For now, we'll leave it in redirecting state
    } catch {
      setOauthStatus("error");
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    setIsDisconnecting(true);
    try {
      await onDisconnect();
      onOpenChange(false);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#4A154B20" }}
            >
              <SlackIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Slack</DialogTitle>
              <DialogDescription>Connect your Slack workspace</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <AnimatePresence mode="wait">
            {isConnected && config?.workspaceName ? (
              /* Connected state */
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Connected to</p>
                    <p className="text-xl font-semibold">{config.workspaceName}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="flex gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Add the bot to channels where you want it to respond. Mention @Clawdbrain or DM the bot directly.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : oauthStatus === "redirecting" ? (
              /* Redirecting state */
              <motion.div
                key="redirecting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#4A154B]/10">
                    <SlackIcon className="h-10 w-10" />
                  </div>
                  <motion.div
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium">Redirecting to Slack...</p>
                  <p className="text-sm text-muted-foreground">
                    Complete the authorization in the Slack window
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOauthStatus("idle")}
                  className="mt-2"
                >
                  Cancel
                </Button>
              </motion.div>
            ) : oauthStatus === "error" ? (
              /* Error state */
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
                  <p className="text-sm text-destructive font-medium">
                    Failed to connect to Slack
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please try again or check your network connection.
                  </p>
                </div>
                <Button onClick={handleConnect} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </motion.div>
            ) : (
              /* Initial state */
              <motion.div
                key="initial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#4A154B]/10">
                    <SlackIcon className="h-10 w-10" />
                  </div>
                  <div className="text-center space-y-2 max-w-[280px]">
                    <p className="font-medium">Connect Your Workspace</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your Slack workspace to send and receive messages through Slack.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">What happens next:</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">1.</span>
                      You will be redirected to Slack
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">2.</span>
                      Select the workspace to connect
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">3.</span>
                      Authorize Clawdbrain to access your workspace
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">4.</span>
                      You will be redirected back here
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleConnect}
                  className="w-full"
                  style={{ backgroundColor: "#4A154B" }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with Slack
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="mt-6 flex-row gap-2 sm:justify-between">
          {isConnected && onDisconnect && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
