"use client";

import * as React from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ExternalLink, ChevronDown, CheckCircle2, HelpCircle, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { discordBotTokenSchema } from "@/lib/validation";
import { showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { DiscordIcon } from "./icons";
import type { DiscordConfig } from "./types";

interface DiscordConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: DiscordConfig;
  onSave: (config: DiscordConfig) => Promise<void>;
  onDisconnect?: () => Promise<void>;
  isConnected?: boolean;
}

export function DiscordConfigSheet({
  open,
  onOpenChange,
  config,
  onSave,
  onDisconnect,
  isConnected,
}: DiscordConfigSheetProps) {
  const [botToken, setBotToken] = React.useState(config?.botToken ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = React.useState(false);

  // Validate bot token
  const tokenValidation = useFieldValidation(discordBotTokenSchema, botToken, {
    debounceMs: 300,
    skipEmpty: true,
  });
  const showValidationError = hasInteracted && !tokenValidation.isValid && tokenValidation.error;

  React.useEffect(() => {
    if (open) {
      setBotToken(config?.botToken ?? "");
      setHasInteracted(false);
      setShowSaveConfirmation(false);
      setHelpOpen(false);
    }
  }, [open, config]);

  const handleSave = async () => {
    if (!botToken.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ botToken: botToken.trim() });
      setShowSaveConfirmation(true);
      showSuccess("Discord bot token saved successfully");
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } finally {
      setIsSaving(false);
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
              style={{ backgroundColor: "#5865F220" }}
            >
              <DiscordIcon className="h-5 w-5" style={{ color: "#5865F2" }} />
            </div>
            <div>
              <DialogTitle>Discord</DialogTitle>
              <DialogDescription>Configure your Discord bot</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Save confirmation */}
          <AnimatePresence>
            {showSaveConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-green-500/30 bg-green-500/10 p-3"
              >
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Token saved successfully</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor="discord-token">Bot Token</Label>
            <Input
              id="discord-token"
              type="password"
              placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.XXXXXX.XXXXXXXXX"
              value={botToken}
              onChange={(e) => {
                setHasInteracted(true);
                setBotToken(e.target.value);
              }}
              className={cn(
                showValidationError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
              )}
              aria-invalid={!!showValidationError}
            />
            {showValidationError ? (
              <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                {tokenValidation.error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Get your bot token from the{" "}
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Discord Developer Portal
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
          </div>

          {/* Server/Guild hint */}
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                After connecting, invite your bot to a server using the OAuth2 URL from the Developer Portal.
                The bot will only respond to messages in servers where it has been added.
              </p>
            </div>
          </div>

          {/* Help section */}
          <Collapsible.Root open={helpOpen} onOpenChange={setHelpOpen}>
            <Collapsible.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  How to get your bot token
                </span>
                <motion.div
                  animate={{ rotate: helpOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </Button>
            </Collapsible.Trigger>

            <Collapsible.Content forceMount>
              <AnimatePresence initial={false}>
                {helpOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg border border-border bg-muted/50 p-4 mt-2 space-y-3">
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                        <li>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord Developer Portal</a></li>
                        <li>Click <span className="font-medium text-foreground">New Application</span> and give it a name</li>
                        <li>Navigate to the <span className="font-medium text-foreground">Bot</span> section in the sidebar</li>
                        <li>Click <span className="font-medium text-foreground">Reset Token</span> to generate a new token</li>
                        <li>Copy the token and paste it above</li>
                        <li>Enable <span className="font-medium text-foreground">Message Content Intent</span> under Privileged Gateway Intents</li>
                      </ol>
                      <div className="pt-2 border-t border-border">
                        <a
                          href="https://discord.com/developers/docs/getting-started"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Read the official documentation
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible.Content>
          </Collapsible.Root>
        </div>

        <DialogFooter className="mt-6 flex-row gap-2 sm:justify-between">
          {isConnected && onDisconnect && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting || isSaving}
            >
              {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !botToken.trim() || !tokenValidation.isValid}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isConnected ? "Update" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
