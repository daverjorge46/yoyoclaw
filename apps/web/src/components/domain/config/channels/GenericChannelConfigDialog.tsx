"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ExternalLink, CheckCircle2, HelpCircle, ChevronDown, Download, AlertTriangle } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";

import { showSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { channelIconMap, channelColorMap } from "./icons";
import type { ChannelConfig, RelayProvider } from "./types";

interface FieldConfig {
  name: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "url";
  helpText?: string;
}

interface GenericChannelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelConfig;
  fields?: FieldConfig[];
  docsUrl?: string;
  helpSteps?: string[];
  onSave?: (values: Record<string, string>) => Promise<void>;
  onDisconnect?: () => Promise<void>;
  isConnected?: boolean;
  /** Whether the channel is unsupported on current platform */
  isUnsupported?: boolean;
  /** Relay providers for unsupported platforms */
  relayProviders?: RelayProvider[];
}

export function GenericChannelConfigDialog({
  open,
  onOpenChange,
  channel,
  fields = [],
  docsUrl,
  helpSteps = [],
  onSave,
  onDisconnect,
  isConnected,
  isUnsupported,
  relayProviders = [],
}: GenericChannelConfigDialogProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = React.useState(false);

  const IconComponent = channelIconMap[channel.id];
  const channelColor = channelColorMap[channel.id];

  React.useEffect(() => {
    if (open) {
      setValues({});
      setShowSaveConfirmation(false);
      setHelpOpen(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(values);
      setShowSaveConfirmation(true);
      showSuccess(`${channel.name} connected successfully`);
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

  const isFormValid = fields.every((field) => values[field.name]?.trim());
  const requiresInstallation = channel.platform?.requiresInstallation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${channelColor}20` }}
            >
              <IconComponent className="h-5 w-5" style={{ color: channelColor }} />
            </div>
            <div>
              <DialogTitle>{channel.name}</DialogTitle>
              <DialogDescription>{channel.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Unsupported platform notice */}
          {isUnsupported && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Not Available on This Platform</p>
                  <p className="text-muted-foreground mt-1">
                    {channel.name} is only available on: {channel.platform?.supported.join(", ")}
                  </p>
                  {relayProviders.length > 0 && (
                    <p className="text-muted-foreground mt-2">
                      However, you can use a relay service to enable this functionality.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Relay providers for unsupported platforms */}
          {isUnsupported && relayProviders.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Alternative Options:</p>
              {relayProviders.map((provider) => (
                <div
                  key={provider.name}
                  className="rounded-lg border border-border bg-muted/50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{provider.name}</span>
                    {provider.pricing && (
                      <Badge variant="outline" className="text-xs">
                        {provider.pricing}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                  {provider.features && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-[10px]">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => window.open(provider.url, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Learn More
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Installation required notice */}
          {!isUnsupported && requiresInstallation && (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex gap-2">
                <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Installation Required</p>
                  <p className="text-muted-foreground mt-1">
                    This channel requires <span className="font-mono text-xs">{channel.platform?.installationApp}</span> to be installed.
                  </p>
                  {channel.platform?.installationUrl && (
                    <a
                      href={channel.platform.installationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      Installation guide
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

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
                  <span className="text-sm font-medium">Connected successfully</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Config fields (only show if supported) */}
          {!isUnsupported && fields.length > 0 && (
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={`field-${field.name}`}>{field.label}</Label>
                  <Input
                    id={`field-${field.name}`}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={values[field.name] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                    }
                  />
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Help section */}
          {!isUnsupported && helpSteps.length > 0 && (
            <Collapsible.Root open={helpOpen} onOpenChange={setHelpOpen}>
              <Collapsible.Trigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    How to set up
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
                          {helpSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                        {docsUrl && (
                          <div className="pt-2 border-t border-border">
                            <a
                              href={docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              Read the documentation
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Collapsible.Content>
            </Collapsible.Root>
          )}
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
            {isUnsupported ? "Close" : "Cancel"}
          </Button>
          {!isUnsupported && onSave && (
            <Button
              onClick={handleSave}
              disabled={isSaving || (fields.length > 0 && !isFormValid)}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isConnected ? "Update" : "Connect"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenericChannelConfigDialog;
