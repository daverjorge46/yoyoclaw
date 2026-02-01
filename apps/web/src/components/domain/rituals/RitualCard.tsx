"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock, Calendar, Bot, Play, Pause, Settings } from "lucide-react";

export type RitualFrequency = "hourly" | "daily" | "weekly" | "monthly" | "custom";

export interface Ritual {
  id: string;
  name: string;
  description?: string;
  frequency: RitualFrequency;
  time: string; // HH:mm format
  enabled: boolean;
  agentId?: string;
  agentName?: string;
  nextOccurrence?: Date;
  lastRun?: Date;
  customCron?: string; // For custom frequency
}

interface RitualCardProps {
  ritual: Ritual;
  variant?: "expanded" | "compact";
  onToggle?: () => void;
  onSettings?: () => void;
  onAgentClick?: () => void;
  className?: string;
}

const frequencyConfig: Record<RitualFrequency, { label: string; color: string; icon: typeof RefreshCw }> = {
  hourly: { label: "Hourly", color: "bg-slate-500/20 text-slate-500", icon: Clock },
  daily: { label: "Daily", color: "bg-blue-500/20 text-blue-500", icon: RefreshCw },
  weekly: { label: "Weekly", color: "bg-purple-500/20 text-purple-500", icon: Calendar },
  monthly: { label: "Monthly", color: "bg-green-500/20 text-green-500", icon: Calendar },
  custom: { label: "Custom", color: "bg-orange-500/20 text-orange-500", icon: Clock },
};

function formatNextOccurrence(date?: Date): string {
  if (!date) return "Not scheduled";

  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (diff < 0) return "Overdue";
  if (hours < 1) return "Less than an hour";
  if (hours < 24) return `In ${hours} hour${hours !== 1 ? "s" : ""}`;
  if (days < 7) return `In ${days} day${days !== 1 ? "s" : ""}`;

  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function RitualCard({
  ritual,
  variant = "expanded",
  onToggle,
  onSettings,
  onAgentClick,
  className,
}: RitualCardProps) {
  const freq = frequencyConfig[ritual.frequency];
  const FreqIcon = freq.icon;

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
        className={cn("group", className)}
      >
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            {/* Status indicator */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <RefreshCw className={cn("h-5 w-5", ritual.enabled ? "text-primary" : "text-muted-foreground")} />
              {ritual.enabled && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="truncate text-sm font-medium text-foreground">{ritual.name}</h4>
              <p className="truncate text-xs text-muted-foreground">
                {formatTime(ritual.time)} - {freq.label}
              </p>
            </div>

            {/* Quick action */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {ritual.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("group relative", className)}
    >
      <Card className="relative overflow-hidden rounded-2xl border-border/50 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
        {/* Gradient accent line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-60",
          ritual.enabled ? "from-primary via-accent to-primary" : "from-muted via-muted-foreground/30 to-muted"
        )} />

        {/* Glow effect on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <CardContent className="relative p-6">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <Badge className={cn("text-xs font-medium", freq.color)}>
              <FreqIcon className="mr-1 h-3 w-3" />
              {freq.label}
            </Badge>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-medium",
                ritual.enabled ? "text-green-500" : "text-muted-foreground"
              )}>
                {ritual.enabled ? "Active" : "Paused"}
              </span>
              <div className="relative flex h-3 w-3 items-center justify-center">
                <span className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  ritual.enabled ? "bg-green-500" : "bg-gray-400"
                )} />
                {ritual.enabled && (
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-green-500 opacity-40 animate-ping" />
                )}
              </div>
            </div>
          </div>

          {/* Icon and info */}
          <div className="mb-5 flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 15 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
              <div className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-full ring-2 ring-border/50 shadow-lg transition-all duration-300 group-hover:ring-primary/30",
                ritual.enabled ? "bg-primary/10" : "bg-secondary"
              )}>
                <RefreshCw className={cn(
                  "h-8 w-8",
                  ritual.enabled ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
            </motion.div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                {ritual.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(ritual.time)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {ritual.description && (
            <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
              {ritual.description}
            </p>
          )}

          {/* Next occurrence */}
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Next:</span>
            <span className="text-sm font-medium text-foreground">
              {formatNextOccurrence(ritual.nextOccurrence)}
            </span>
          </div>

          {/* Agent association */}
          {ritual.agentName && (
            <button
              onClick={onAgentClick}
              className="mb-5 flex w-full items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-left transition-all hover:border-primary/30 hover:bg-secondary/50"
            >
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Assigned to:</span>
              <span className="text-sm font-medium text-foreground">{ritual.agentName}</span>
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onToggle}
              className={cn(
                "flex-1 h-11 rounded-xl transition-all",
                ritual.enabled
                  ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
                  : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
              )}
              variant="ghost"
            >
              {ritual.enabled ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </Button>
            <Button
              onClick={onSettings}
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl bg-secondary/50 hover:bg-secondary transition-all"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Last run */}
          {ritual.lastRun && (
            <p className="mt-4 text-center text-xs text-muted-foreground/70">
              Last run {ritual.lastRun.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default RitualCard;
