"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Sparkles,
  Zap,
  Brain,
  Cpu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Agent, AgentStatus } from "@/stores/useAgentStore";
import type { Workspace } from "@/stores/useWorkspaceStore";

// Available models for selection
const MODELS = [
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Fast and capable, great for most tasks",
    icon: Sparkles,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    recommended: true,
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Most powerful for complex reasoning",
    icon: Brain,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    recommended: false,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Multimodal with vision capabilities",
    icon: Zap,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    recommended: false,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Large context window with good speed",
    icon: Cpu,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    recommended: false,
  },
] as const;

// Avatar color options
const AVATAR_COLORS = [
  "from-blue-500 to-purple-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-500",
  "from-amber-500 to-orange-500",
  "from-cyan-500 to-blue-500",
  "from-violet-500 to-purple-500",
];

// Name suggestions for new agents
const NAME_SUGGESTIONS = [
  "Research Assistant",
  "Code Helper",
  "Writing Coach",
  "Task Manager",
  "Creative Partner",
  "Data Analyst",
];

interface FormState {
  step: number;
  name: string;
  avatarColor: string;
  avatarUrl?: string;
  modelId: string;
  workspaceIds: string[];
  showWorkspaces: boolean;
}

export interface AgentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  workspaces?: Workspace[];
  onSubmit: (data: {
    name: string;
    role: string;
    avatar?: string;
    status: AgentStatus;
    description?: string;
  }) => void;
  isSubmitting?: boolean;
}

export function AgentFormModal({
  open,
  onOpenChange,
  agent,
  workspaces = [],
  onSubmit,
  isSubmitting = false,
}: AgentFormModalProps) {
  const isEditing = !!agent;

  const [state, setState] = React.useState<FormState>({
    step: 1,
    name: "",
    avatarColor: AVATAR_COLORS[0],
    avatarUrl: undefined,
    modelId: "claude-3.5-sonnet",
    workspaceIds: [],
    showWorkspaces: false,
  });

  // Reset state when dialog opens/closes or agent changes
  React.useEffect(() => {
    if (open) {
      if (agent) {
        // Editing: populate with agent data
        setState({
          step: 1,
          name: agent.name,
          avatarColor: AVATAR_COLORS[0],
          avatarUrl: agent.avatar,
          modelId: agent.role?.toLowerCase().replace(/ /g, "-") ?? "claude-3.5-sonnet",
          workspaceIds: [],
          showWorkspaces: false,
        });
      } else {
        // Creating: generate sensible defaults
        const randomName =
          NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)];
        const randomColor =
          AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        setState({
          step: 1,
          name: randomName,
          avatarColor: randomColor,
          avatarUrl: undefined,
          modelId: "claude-3.5-sonnet",
          workspaceIds: [],
          showWorkspaces: false,
        });
      }
    }
  }, [open, agent]);

  const handleNext = () => {
    setState((prev) => ({ ...prev, step: prev.step + 1 }));
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: prev.step - 1 }));
  };

  const handleSubmit = () => {
    const selectedModel = MODELS.find((m) => m.id === state.modelId);
    onSubmit({
      name: state.name,
      role: selectedModel?.name ?? "Assistant",
      avatar: state.avatarUrl,
      status: agent?.status ?? "online",
      description: `Powered by ${selectedModel?.name ?? "AI"}`,
    });
  };

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.name.trim().length > 0;
      case 2:
        return !!state.modelId;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const initials = state.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Agent" : "Create New Agent"}
          </DialogTitle>
          <DialogDescription>
            {state.step === 1 && "Give your agent a name and avatar"}
            {state.step === 2 && "Choose which AI model powers your agent"}
            {state.step === 3 && "Assign to workspaces (optional)"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                step === state.step
                  ? "w-8 bg-primary"
                  : step < state.step
                    ? "w-2 bg-primary/60"
                    : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[240px]"
          >
            {/* Step 1: Name + Avatar */}
            {state.step === 1 && (
              <div className="space-y-6">
                {/* Avatar Preview */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-20 w-20">
                    {state.avatarUrl ? (
                      <AvatarImage src={state.avatarUrl} alt={state.name} />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        "bg-gradient-to-br text-white text-2xl font-bold",
                        state.avatarColor
                      )}
                    >
                      {initials || <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>

                  {/* Color picker */}
                  <div className="flex items-center gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setState((prev) => ({ ...prev, avatarColor: color }))
                        }
                        className={cn(
                          "h-6 w-6 rounded-full bg-gradient-to-br transition-all",
                          color,
                          state.avatarColor === color
                            ? "ring-2 ring-primary ring-offset-2"
                            : "opacity-60 hover:opacity-100"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    value={state.name}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter a name for your agent..."
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a memorable name that reflects the agent&apos;s purpose
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Model Selection */}
            {state.step === 2 && (
              <div className="space-y-3">
                {MODELS.map((model) => {
                  const Icon = model.icon;
                  const isSelected = state.modelId === model.id;
                  return (
                    <Card
                      key={model.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "hover:border-primary/50"
                      )}
                      onClick={() =>
                        setState((prev) => ({ ...prev, modelId: model.id }))
                      }
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                              model.bgColor
                            )}
                          >
                            <Icon className={cn("h-5 w-5", model.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {model.name}
                              </span>
                              {model.recommended && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  Recommended
                                </Badge>
                              )}
                              {isSelected && (
                                <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {model.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Step 3: Workspace Assignment (collapsed by default) */}
            {state.step === 3 && (
              <div className="space-y-4">
                {/* Summary */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback
                          className={cn(
                            "bg-gradient-to-br text-white font-bold",
                            state.avatarColor
                          )}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{state.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {MODELS.find((m) => m.id === state.modelId)?.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Workspace assignment (collapsible) */}
                {workspaces.length > 0 && (
                  <div className="border rounded-lg">
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          showWorkspaces: !prev.showWorkspaces,
                        }))
                      }
                      className="flex items-center justify-between w-full p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      <span>Assign to Workspaces</span>
                      <div className="flex items-center gap-2">
                        {state.workspaceIds.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {state.workspaceIds.length} selected
                          </Badge>
                        )}
                        {state.showWorkspaces ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {state.showWorkspaces && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 space-y-2">
                            {workspaces.map((workspace) => {
                              const isSelected = state.workspaceIds.includes(
                                workspace.id
                              );
                              return (
                                <button
                                  key={workspace.id}
                                  type="button"
                                  onClick={() =>
                                    setState((prev) => ({
                                      ...prev,
                                      workspaceIds: isSelected
                                        ? prev.workspaceIds.filter(
                                            (id) => id !== workspace.id
                                          )
                                        : [...prev.workspaceIds, workspace.id],
                                    }))
                                  }
                                  className={cn(
                                    "flex items-center justify-between w-full p-2 rounded-md text-sm transition-colors",
                                    isSelected
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-muted"
                                  )}
                                >
                                  <span>{workspace.name}</span>
                                  {isSelected && (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  You can always change these settings later
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="gap-2">
          {state.step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
          {state.step < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Agent"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AgentFormModal;
