export const TASK_STORE_KEY = "openclaw.tasks.v1";

export type TaskPriority = "P0" | "P1" | "P2" | "P3";
export type TaskLane = "client" | "notino" | "vectra";

export type TaskItem = {
  id: string;
  title: string;
  project?: string;
  lane: TaskLane;
  priority: TaskPriority;
  nextAction?: string;
  due?: string;
  assignedAgent?: string;
  activeOnChat?: boolean;
};

export type TaskStore = {
  currentEndeavor?: string;
  currentEndeavorStatus?: string;
  currentEndeavorEta?: string;
  topOutcomes: string[];
  tasks: TaskItem[];
};

export function loadTaskStore(): TaskStore {
  if (typeof window === "undefined") {
    return {
      currentEndeavor: "",
      currentEndeavorStatus: "",
      currentEndeavorEta: "",
      topOutcomes: [],
      tasks: [],
    };
  }
  try {
    const raw = window.localStorage.getItem(TASK_STORE_KEY);
    if (!raw) {
      return { currentEndeavor: "", currentEndeavorStatus: "", currentEndeavorEta: "", topOutcomes: [], tasks: [] };
    }
    const parsed = JSON.parse(raw) as Partial<TaskStore>;
    return {
      currentEndeavor: typeof parsed.currentEndeavor === "string" ? parsed.currentEndeavor : "",
      currentEndeavorStatus:
        typeof parsed.currentEndeavorStatus === "string" ? parsed.currentEndeavorStatus : "",
      currentEndeavorEta:
        typeof parsed.currentEndeavorEta === "string" ? parsed.currentEndeavorEta : "",
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
                project: typeof candidate.project === "string" ? candidate.project : undefined,
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
    return {
      currentEndeavor: "",
      currentEndeavorStatus: "",
      currentEndeavorEta: "",
      topOutcomes: [],
      tasks: [],
    };
  }
}

export function saveTaskStore(store: TaskStore): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TASK_STORE_KEY, JSON.stringify(store));
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

export function getImmediateIssues(tasks: TaskItem[], max = 3): TaskItem[] {
  return sortByPriority(tasks).filter((task) => task.priority === "P0").slice(0, max);
}

export function getNearTermProjects(tasks: TaskItem[], maxProjects = 4): Array<{ project: string; topTask: TaskItem }> {
  const byProject = new Map<string, TaskItem[]>();
  for (const task of tasks) {
    const project = (task.project || "General").trim() || "General";
    const list = byProject.get(project) ?? [];
    list.push(task);
    byProject.set(project, list);
  }
  const ranked = Array.from(byProject.entries()).map(([project, list]) => ({
    project,
    topTask: sortByPriority(list)[0],
  }));
  ranked.sort((a, b) => a.topTask.priority.localeCompare(b.topTask.priority));
  return ranked.slice(0, maxProjects);
}
