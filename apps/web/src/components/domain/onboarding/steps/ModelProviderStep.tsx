"use client";

import { motion } from "framer-motion";
import { Bot, Check, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type ModelProvider = "openai" | "anthropic" | "openrouter" | "local";

interface ModelProviderConfig {
  provider: ModelProvider;
  apiKey: string;
}

interface ModelProviderStepProps {
  config: ModelProviderConfig;
  onConfigChange: (config: ModelProviderConfig) => void;
}

const providers = [
  {
    id: "openai" as const,
    name: "OpenAI",
    description: "GPT-4, GPT-4 Turbo, and more",
    icon: "O",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "anthropic" as const,
    name: "Anthropic",
    description: "Claude 3 Opus, Sonnet, Haiku",
    icon: "A",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "openrouter" as const,
    name: "OpenRouter",
    description: "Access multiple providers",
    icon: "R",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "local" as const,
    name: "Local Models",
    description: "Ollama, LM Studio, etc.",
    icon: "L",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export function ModelProviderStep({
  config,
  onConfigChange,
}: ModelProviderStepProps) {
  const selectedProvider = providers.find((p) => p.id === config.provider);

  return (
    <div className="flex flex-col items-center px-4">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="mb-6"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bot className="h-8 w-8 text-primary" />
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center space-y-2 mb-8"
      >
        <h2 className="text-2xl font-bold tracking-tight">
          Choose Your AI Provider
        </h2>
        <p className="text-muted-foreground max-w-md">
          Select the AI model provider you want to use. You can change this later.
        </p>
      </motion.div>

      {/* Provider Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-lg mb-6"
      >
        <div className="grid grid-cols-2 gap-3">
          {providers.map((provider, index) => {
            const isSelected = config.provider === provider.id;
            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:border-primary/50",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() =>
                    onConfigChange({ ...config, provider: provider.id })
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bold text-lg",
                          provider.bgColor,
                          provider.color
                        )}
                      >
                        {provider.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">
                            {provider.name}
                          </h4>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* API Key Input */}
      {config.provider !== "local" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {selectedProvider?.name} API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder={`Enter your ${selectedProvider?.name} API key...`}
              value={config.apiKey}
              onChange={(e) =>
                onConfigChange({ ...config, apiKey: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored securely and never shared.
            </p>
          </div>
        </motion.div>
      )}

      {config.provider === "local" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Local models run on your own hardware. Make sure you have Ollama or LM Studio installed and running.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default ModelProviderStep;
