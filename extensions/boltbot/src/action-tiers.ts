export type Tier = "low" | "medium" | "high";

const TIER_MAP: Record<string, Tier> = {
  exec: "high",
  apply_patch: "high",
  gateway: "high",
  sessions_spawn: "high",
  process: "high",

  message: "medium",
  write: "medium",
  edit: "medium",
  cron: "medium",
  sessions_send: "medium",
  browser: "medium",
  canvas: "medium",
  nodes: "medium",

  web_search: "low",
  web_fetch: "low",
  memory_search: "low",
  memory_get: "low",
  read: "low",
  sessions_list: "low",
  sessions_history: "low",
  session_status: "low",
  agents_list: "low",
  image: "low",
};

export function getTier(toolName: string): Tier {
  const normalized = toolName.toLowerCase().replace(/-/g, "_");
  return TIER_MAP[normalized] ?? "medium";
}
