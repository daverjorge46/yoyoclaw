export const TASK_STORE_KEY = "openclaw.tasks.v1";

export type TaskPriority = "P0" | "P1" | "P2" | "P3";
export type TaskLane = "client" | "notino" | "vectra";

export type TaskItem = {
  id: string;
  title: string;
  lane: TaskLane;
  priority: TaskPriority;
  nextAction?: string;
  due?: string;
  assignedAgent?: string;
  activeOnChat?: boolean;
};

export type TaskStore = {
  topOutcomes: string[];
  tasks: TaskItem[];
};

export function loadTaskStore(): TaskStore {
  if (typeof window === "undefined") {
    return { topOutcomes: [], tasks: [] };
  }
  try {
    const raw = window.localStorage.getItem(TASK_STORE_KEY);
    if (!raw) {
      return { topOutcomes: [], tasks: [] };
    }
    const parsed = JSON.parse(raw) as Partial<TaskStore>;
    return {
      topOutcomes: Array.isArray(parsed.topOutcomes)
        ? parsed.topOutcomes.filter((entry) => typeof entry === "string")
        : [],
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks
            .filter((task) => task && typeof task === "object")
            .map((task) => {
              const candidate = task as Partial<TaskItem>;
              const priority =
                candidate.priority === "P0" ||
                candidate.priority === "P1" ||
                candidate.priority === "P2" ||
                candidate.priority === "P3"
                  ? candidate.priority
                  : "P2";
              const lane =
                candidate.lane === "client" ||
                candidate.lane === "notino" ||
                candidate.lane === "vectra"
                  ? candidate.lane
                  : "client";
              return {
                id: String(candidate.id ?? ""),
                title: String(candidate.title ?? "Untitled task"),
                lane,
                priority,
                nextAction:
                  typeof candidate.nextAction === "string" ? candidate.nextAction : undefined,
                due: typeof candidate.due === "string" ? candidate.due : undefined,
                assignedAgent:
                  typeof candidate.assignedAgent === "string"
                    ? candidate.assignedAgent
                    : undefined,
                activeOnChat:
                  typeof candidate.activeOnChat === "boolean"
                    ? candidate.activeOnChat
                    : undefined,
              } as TaskItem;
            })
        : [],
    };
  } catch {
    return { topOutcomes: [], tasks: [] };
  }
}

export function laneLabel(lane: TaskLane): string {
  if (lane === "client") {
    return "Client Delivery";
  }
  if (lane === "notino") {
    return "Notino";
  }
  return "Vectra / Algovectra";
}

export function sortByPriority(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => a.priority.localeCompare(b.priority));
}

export function getActiveChatTasks(tasks: TaskItem[], max = 5): TaskItem[] {
  const prioritized = sortByPriority(tasks);
  const explicit = prioritized.filter((task) => task.activeOnChat === true);
  if (explicit.length > 0) {
    return explicit.slice(0, max);
  }
  return prioritized.filter((task) => task.priority === "P0" || task.priority === "P1").slice(0, max);
}
