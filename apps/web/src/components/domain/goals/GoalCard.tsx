"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Calendar, CheckCircle2, ArrowRight, GitBranch } from "lucide-react";

export type GoalStatus = "active" | "completed" | "archived";

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  progress: number;
  status: GoalStatus;
  milestones?: Milestone[];
  workstreamCount?: number;
  createdAt?: string;
  completedAt?: string;
}

interface GoalCardProps {
  goal: Goal;
  variant?: "expanded" | "compact";
  onViewDetails?: () => void;
  onEdit?: () => void;
  className?: string;
}

const statusConfig: Record<GoalStatus, { color: string; bgColor: string; label: string }> = {
  active: { color: "text-primary", bgColor: "bg-primary/20", label: "Active" },
  completed: { color: "text-success", bgColor: "bg-success/20", label: "Completed" },
  archived: { color: "text-muted-foreground", bgColor: "bg-muted", label: "Archived" },
};

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return "Due today";
  } else if (diffDays === 1) {
    return "Due tomorrow";
  } else if (diffDays <= 7) {
    return `${diffDays} days left`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function ProgressBar({ progress, status }: { progress: number; status: GoalStatus }) {
  const progressColor = status === "completed"
    ? "bg-success"
    : status === "archived"
      ? "bg-muted-foreground"
      : "bg-primary";

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn("h-full rounded-full", progressColor)}
      />
    </div>
  );
}

export function GoalCard({
  goal,
  variant = "expanded",
  onViewDetails,
  onEdit,
  className,
}: GoalCardProps) {
  const status = statusConfig[goal.status];
  const completedMilestones = goal.milestones?.filter((m) => m.completed).length ?? 0;
  const totalMilestones = goal.milestones?.length ?? 0;

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
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Target className={cn("h-5 w-5", status.color)} />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium text-foreground">{goal.title}</h4>
              <div className="mt-1 flex items-center gap-2">
                <ProgressBar progress={goal.progress} status={goal.status} />
                <span className="shrink-0 text-xs text-muted-foreground">{goal.progress}%</span>
              </div>
            </div>

            {/* Quick action */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onViewDetails}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ArrowRight className="h-4 w-4" />
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
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-60" />

        {/* Glow effect on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <CardContent className="relative p-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <Badge className={cn(status.bgColor, status.color, "border-0")}>
              {status.label}
            </Badge>
            {goal.deadline && goal.status === "active" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDeadline(goal.deadline)}</span>
              </div>
            )}
          </div>

          {/* Title and icon */}
          <div className="mb-4 flex items-start gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/40 to-accent/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-border/50 shadow-lg transition-all duration-300 group-hover:ring-primary/30">
                <Target className={cn("h-7 w-7", status.color)} />
              </div>
            </motion.div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
                {goal.title}
              </h3>
              {goal.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {goal.description}
                </p>
              )}
            </div>
          </div>

          {/* Progress section */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{goal.progress}%</span>
            </div>
            <ProgressBar progress={goal.progress} status={goal.status} />
          </div>

          {/* Metadata row */}
          <div className="mb-5 flex flex-wrap gap-3">
            {totalMilestones > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground transition-all duration-200 hover:border-primary/30 hover:bg-secondary"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {completedMilestones}/{totalMilestones} milestones
                </span>
              </motion.div>
            )}
            {goal.workstreamCount !== undefined && goal.workstreamCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground transition-all duration-200 hover:border-primary/30 hover:bg-secondary"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>
                  {goal.workstreamCount} workstream{goal.workstreamCount !== 1 ? "s" : ""}
                </span>
              </motion.div>
            )}
          </div>

          {/* Milestone indicators (mini visualization) */}
          {goal.milestones && goal.milestones.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-1">
                {goal.milestones.slice(0, 6).map((milestone, index) => (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    title={milestone.title}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      milestone.completed
                        ? "bg-success"
                        : "bg-secondary/80"
                    )}
                  />
                ))}
                {goal.milestones.length > 6 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    +{goal.milestones.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onViewDetails}
              className="h-11 flex-1 rounded-xl bg-primary/10 text-primary transition-all hover:bg-primary/20"
              variant="ghost"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              View Details
            </Button>
            {goal.status !== "archived" && (
              <Button
                onClick={onEdit}
                variant="ghost"
                className="h-11 rounded-xl bg-secondary/50 transition-all hover:bg-secondary"
              >
                Edit
              </Button>
            )}
          </div>

          {/* Completed date */}
          {goal.completedAt && goal.status === "completed" && (
            <p className="mt-4 text-center text-xs text-muted-foreground/70">
              Completed on {new Date(goal.completedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default GoalCard;
