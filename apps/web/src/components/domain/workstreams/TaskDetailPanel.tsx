"use client";

import * as React from "react";
import { DetailPanel } from "@/components/composed/DetailPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Flag,
  GitBranch,
  Link2,
  Loader2,
  Trash2,
  User,
} from "lucide-react";
import type {
  Task,
  TaskStatus,
  TaskPriority,
} from "@/hooks/queries/useWorkstreams";
import type { Agent } from "@/stores/useAgentStore";
import { useAgents } from "@/hooks/queries/useAgents";
import {
  useUpdateTask,
  useUpdateTaskStatus,
  useUpdateTaskPriority,
  useDeleteTask,
} from "@/hooks/mutations/useWorkstreamMutations";
import { cn } from "@/lib/utils";

interface TaskDetailPanelProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  workstreamId: string;
  allTasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

const statusOptions: { value: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { value: "todo", label: "To Do", icon: <Circle className="h-4 w-4" /> },
  { value: "in_progress", label: "In Progress", icon: <Clock className="h-4 w-4" /> },
  { value: "review", label: "Review", icon: <Eye className="h-4 w-4" /> },
  { value: "done", label: "Done", icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: "blocked", label: "Blocked", icon: <AlertCircle className="h-4 w-4" /> },
];

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-gray-500" },
  { value: "medium", label: "Medium", color: "text-blue-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "urgent", label: "Urgent", color: "text-red-500" },
];

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-500/20 text-gray-500",
  in_progress: "bg-yellow-500/20 text-yellow-500",
  review: "bg-purple-500/20 text-purple-500",
  done: "bg-green-500/20 text-green-500",
  blocked: "bg-red-500/20 text-red-500",
};

function getAgentInitials(agent: Agent | null | undefined): string {
  if (!agent?.name) return "?";
  return agent.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TaskDetailPanel({
  open,
  onClose,
  task,
  workstreamId,
  allTasks,
  onTaskClick,
}: TaskDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const { data: agents = [] } = useAgents();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const updatePriority = useUpdateTaskPriority();
  const deleteTask = useDeleteTask();

  const assignedAgent = agents.find((a) => a.id === task?.assigneeId);

  // Find dependencies and dependents
  const dependencies = React.useMemo(() => {
    if (!task?.dependencies) return [];
    return allTasks.filter((t) => task.dependencies?.includes(t.id));
  }, [task, allTasks]);

  const dependents = React.useMemo(() => {
    if (!task) return [];
    return allTasks.filter((t) => t.dependencies?.includes(task.id));
  }, [task, allTasks]);

  // Calculate progress based on status
  const progress = React.useMemo(() => {
    if (!task) return 0;
    switch (task.status) {
      case "done":
        return 100;
      case "review":
        return 75;
      case "in_progress":
        return 50;
      case "blocked":
        return 25;
      default:
        return 0;
    }
  }, [task]);

  const handleStatusChange = (status: TaskStatus) => {
    if (!task) return;
    updateStatus.mutate({
      workstreamId,
      taskId: task.id,
      status,
    });
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    if (!task) return;
    updatePriority.mutate({
      workstreamId,
      taskId: task.id,
      priority,
    });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    if (!task) return;
    updateTask.mutate({
      workstreamId,
      task: {
        id: task.id,
        assigneeId: assigneeId || undefined,
      },
    });
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask.mutate(
      { workstreamId, taskId: task.id },
      {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          onClose();
        },
      }
    );
  };

  if (!task) {
    return (
      <DetailPanel open={open} onClose={onClose} title="Task Details" width="lg">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No task selected
        </div>
      </DetailPanel>
    );
  }

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title="Task Details"
      width="lg"
    >
      <div className="space-y-6">
        {/* Header with status */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xl font-semibold leading-tight text-foreground">
              {task.title}
            </h3>
            <Badge className={cn("shrink-0", statusColors[task.status])}>
              {statusOptions.find((s) => s.value === task.status)?.label}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <Separator />

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Description</Label>
          {task.description ? (
            <p className="text-sm text-foreground">{task.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description</p>
          )}
        </div>

        <Separator />

        {/* Status selector */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Status</Label>
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority selector */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Priority</Label>
          <Select value={task.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className={cn("flex items-center gap-2", option.color)}>
                    <Flag className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned agent */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Assigned Agent</Label>
          <Select
            value={task.assigneeId ?? ""}
            onValueChange={handleAssigneeChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Unassigned">
                {assignedAgent && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={assignedAgent.avatar} />
                      <AvatarFallback className="text-[10px]">
                        {getAgentInitials(assignedAgent)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{assignedAgent.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Unassigned</span>
                </div>
              </SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback className="text-[10px]">
                        {getAgentInitials(agent)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{agent.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Due Date</Label>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Dependencies */}
        <div className="space-y-2">
          <Label className="text-muted-foreground flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Dependencies ({dependencies.length})
          </Label>
          {dependencies.length > 0 ? (
            <div className="space-y-2">
              {dependencies.map((dep) => (
                <button
                  key={dep.id}
                  onClick={() => onTaskClick?.(dep.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/50 p-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 h-5", statusColors[dep.status])}
                  >
                    {dep.status}
                  </Badge>
                  <span className="truncate">{dep.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              This task has no dependencies
            </p>
          )}
        </div>

        {/* Dependents */}
        <div className="space-y-2">
          <Label className="text-muted-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Dependents ({dependents.length})
          </Label>
          {dependents.length > 0 ? (
            <div className="space-y-2">
              {dependents.map((dep) => (
                <button
                  key={dep.id}
                  onClick={() => onTaskClick?.(dep.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/50 p-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 h-5", statusColors[dep.status])}
                  >
                    {dep.status}
                  </Badge>
                  <span className="truncate">{dep.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No tasks depend on this task
            </p>
          )}
        </div>

        <Separator />

        {/* Delete section */}
        <div className="space-y-3">
          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Task
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
              <p className="text-sm text-destructive">
                Are you sure you want to delete this task? This action cannot be
                undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                >
                  {deleteTask.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DetailPanel>
  );
}

export default TaskDetailPanel;
