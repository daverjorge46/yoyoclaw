"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, AlertCircle } from "lucide-react";
import { useAgents } from "@/hooks/queries/useAgents";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface AgentSessionsIndicatorProps {
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Additional className */
  className?: string;
}

export function AgentSessionsIndicator({
  collapsed = false,
  className,
}: AgentSessionsIndicatorProps) {
  const { data: agents, isLoading } = useAgents();

  // Calculate stats from agents
  const stats = React.useMemo(() => {
    if (!agents) return { active: 0, waiting: 0 };
    return {
      // "busy" = actively working
      active: agents.filter((a) => a.status === "busy").length,
      // "paused" = waiting for user input/approval (treating paused as waiting)
      waiting: agents.filter((a) => a.status === "paused").length,
    };
  }, [agents]);

  // Don't render if loading or no agents
  if (isLoading || !agents || agents.length === 0) {
    return null;
  }

  // Only show if there are active or waiting sessions
  if (stats.active === 0 && stats.waiting === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {/* Active sessions */}
      {stats.active > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/agents"
              search={{ status: "busy" }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <span className="relative flex size-5 shrink-0 items-center justify-center">
                <Bot className="size-4 text-emerald-500" />
              </span>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <span className="text-emerald-500 font-semibold">{stats.active}</span>
                    <span className="text-muted-foreground"> active</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <div className="font-medium">
              {stats.active} agent{stats.active !== 1 ? "s" : ""} actively working
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Waiting/blocked sessions */}
      {stats.waiting > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/agents"
              search={{ status: "waiting" }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <span className="relative flex size-5 shrink-0 items-center justify-center">
                <AlertCircle className="size-4 text-amber-500" />
              </span>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <span className="text-amber-500 font-semibold">{stats.waiting}</span>
                    <span className="text-muted-foreground"> waiting</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <div className="font-medium">
              {stats.waiting} agent{stats.waiting !== 1 ? "s" : ""} waiting for your input
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Click to view and respond
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default AgentSessionsIndicator;
