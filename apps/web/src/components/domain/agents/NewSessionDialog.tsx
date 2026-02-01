"use client";

import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus, Sparkles, Zap } from "lucide-react";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
}

type SessionMode = "chat" | "task" | "quick";

const sessionModes: { value: SessionMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "chat",
    label: "Chat Session",
    description: "Open-ended conversation with the agent",
    icon: <MessageSquarePlus className="h-4 w-4" />,
  },
  {
    value: "task",
    label: "Task Session",
    description: "Focused session to complete a specific task",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: "quick",
    label: "Quick Action",
    description: "Single prompt with immediate response",
    icon: <Zap className="h-4 w-4" />,
  },
];

export function NewSessionDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
}: NewSessionDialogProps) {
  const navigate = useNavigate();
  const [sessionMode, setSessionMode] = React.useState<SessionMode>("chat");
  const [initialPrompt, setInitialPrompt] = React.useState("");
  const [isStarting, setIsStarting] = React.useState(false);

  const handleStartSession = async () => {
    setIsStarting(true);

    // Simulate session creation - in real app this would call an API
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to the activity tab with the new session
    navigate({
      to: "/agents/$agentId",
      params: { agentId },
      search: { tab: "activity" },
    });

    setIsStarting(false);
    onOpenChange(false);

    // Reset form
    setSessionMode("chat");
    setInitialPrompt("");
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form on close
    setSessionMode("chat");
    setInitialPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            New Session with {agentName}
          </DialogTitle>
          <DialogDescription>
            Start a new conversation or task session with this agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session Mode */}
          <div className="space-y-2">
            <Label htmlFor="session-mode">Session Type</Label>
            <Select value={sessionMode} onValueChange={(v) => setSessionMode(v as SessionMode)}>
              <SelectTrigger id="session-mode">
                <SelectValue placeholder="Select session type" />
              </SelectTrigger>
              <SelectContent>
                {sessionModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex items-center gap-2">
                      {mode.icon}
                      <div>
                        <div className="font-medium">{mode.label}</div>
                        <div className="text-xs text-muted-foreground">{mode.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial Prompt */}
          <div className="space-y-2">
            <Label htmlFor="initial-prompt">
              {sessionMode === "quick" ? "Your prompt" : "Initial message (optional)"}
            </Label>
            <Textarea
              id="initial-prompt"
              placeholder={
                sessionMode === "quick"
                  ? "Enter your prompt..."
                  : "Start with a specific request or leave blank to begin open-ended..."
              }
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleStartSession}
            disabled={isStarting || (sessionMode === "quick" && !initialPrompt.trim())}
            className="gap-2"
          >
            {isStarting ? (
              <>Starting...</>
            ) : (
              <>
                {sessionModes.find((m) => m.value === sessionMode)?.icon}
                Start Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NewSessionDialog;
