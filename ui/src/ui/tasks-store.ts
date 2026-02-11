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

const DEFAULT_TASK_STORE: TaskStore = {
  currentEndeavor: "Rook + Martin: AI-first task management in OpenClaw",
  currentEndeavorStatus: "In Progress",
  currentEndeavorEta: "This week",
  topOutcomes: [
    "Ship task management tab with core workflows",
    "Connect Vectra desktop to OpenClaw backend",
    "Stabilize daily planning loop",
  ],
  tasks: [
    {
      id: "seed-vectra-bridge",
      title: "Rework Vectra desktop app to connect to OpenClaw backend",
      project: "Vectra",
      lane: "vectra",
      priority: "P0",
      nextAction: "Map API surface and wire chat/session connection",
      assignedAgent: "Rook",
      activeOnChat: true,
    },
    {
      id: "seed-task-manager",
      title: "Task manager UX polish (main activity, issues, endeavors)",
      project: "Vectra",
      lane: "vectra",
      priority: "P1",
      nextAction: "Add endeavor status + ETA and project top task visibility",
      assignedAgent: "Rook",
      activeOnChat: true,
    },
    {
      id: "seed-mentem",
      title: "Triage incoming Mentem action items",
      project: "Mentem",
      lane: "client",
      priority: "P1",
      nextAction: "Collect latest email/doc tasks into backlog",
      activeOnChat: true,
    },
    {
      id: "seed-isotra",
      title: "Consolidate ISOTRA Designer pending tasks",
      project: "ISOTRA Designer",
      lane: "client",
      priority: "P1",
      nextAction: "Extract tasks from repo markdown and email threads",
      activeOnChat: true,
    },
    {
      id: "seed-pooltechnika",
      title: "Consolidate Pooltechnika 3D Pool priorities",
      project: "Pooltechnika 3D Pool",
      lane: "client",
      priority: "P1",
      nextAction: "Define nearest milestone + unblockers",
      activeOnChat: true,
    },
    {
      id: "seed-notino",
      title: "Track Notino WMS/VNA long-term stream",
      project: "Notino",
      lane: "notino",
      priority: "P1",
      nextAction: "Break into weekly execution outcomes",
      activeOnChat: true,
    },
  ],
};

function cloneDefaultTaskStore(): TaskStore {
  return {
    ...DEFAULT_TASK_STORE,
    topOutcomes: [...DEFAULT_TASK_STORE.topOutcomes],
    tasks: DEFAULT_TASK_STORE.tasks.map((task) => ({ ...task })),
  };
}

function hydrateStore(parsed: Partial<TaskStore>): TaskStore {
  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks
        .filter((task) => task && typeof task === "object")
        .map((task) => {
          const candidate = task as Partial<TaskItem>;
          const priority: TaskPriority =
            candidate.priority === "P0" ||
            candidate.priority === "P1" ||
            candidate.priority === "P2" ||
            candidate.priority === "P3"
              ? candidate.priority
              : "P2";
          const lane: TaskLane =
            candidate.lane === "client" || candidate.lane === "notino" || candidate.lane === "vectra"
              ? candidate.lane
              : "client";
          return {
            id: String(candidate.id ?? ""),
            title: String(candidate.title ?? "Untitled task"),
            lane,
            priority,
            project: typeof candidate.project === "string" ? candidate.project : undefined,
            nextAction: typeof candidate.nextAction === "string" ? candidate.nextAction : undefined,
            due: typeof candidate.due === "string" ? candidate.due : undefined,
            assignedAgent: typeof candidate.assignedAgent === "string" ? candidate.assignedAgent : undefined,
            activeOnChat: typeof candidate.activeOnChat === "boolean" ? candidate.activeOnChat : undefined,
          } as TaskItem;
        })
    : [];

  const currentEndeavor = typeof parsed.currentEndeavor === "string" ? parsed.currentEndeavor : "";
  const currentEndeavorStatus =
    typeof parsed.currentEndeavorStatus === "string" ? parsed.currentEndeavorStatus : "";
  const currentEndeavorEta = typeof parsed.currentEndeavorEta === "string" ? parsed.currentEndeavorEta : "";

  const topOutcomes = Array.isArray(parsed.topOutcomes)
    ? parsed.topOutcomes.filter((entry) => typeof entry === "string")
    : [];

  if (!currentEndeavor && tasks.length === 0 && topOutcomes.length === 0) {
    return cloneDefaultTaskStore();
  }

  return {
    currentEndeavor,
    currentEndeavorStatus,
    currentEndeavorEta,
    topOutcomes,
    tasks,
  };
}

export function loadTaskStore(): TaskStore {
  if (typeof window === "undefined") {
    return cloneDefaultTaskStore();
  }
  try {
    const raw = window.localStorage.getItem(TASK_STORE_KEY);
    if (!raw) {
      return cloneDefaultTaskStore();
    }
    const parsed = JSON.parse(raw) as Partial<TaskStore>;
    return hydrateStore(parsed);
  } catch {
    return cloneDefaultTaskStore();
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

export function getNearTermProjects(
  tasks: TaskItem[],
  maxProjects = 4,
): Array<{ project: string; topTask: TaskItem }> {
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
