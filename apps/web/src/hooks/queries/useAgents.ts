import { useQuery } from "@tanstack/react-query";

// Re-export types from store for consistency
export type { Agent, AgentStatus } from "../../stores/useAgentStore";
import type { Agent } from "../../stores/useAgentStore";

// Query keys factory for type-safe cache management
export const agentKeys = {
  all: ["agents"] as const,
  lists: () => [...agentKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, "detail"] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
};

// Mock API functions - replace with real API calls later
async function fetchAgents(): Promise<Agent[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [
    {
      id: "1",
      name: "Research Assistant",
      role: "Researcher",
      status: "online",
      description: "Helps with research tasks and information gathering",
      tags: ["research", "analysis", "data"],
      taskCount: 5,
      lastActive: new Date().toISOString(),
    },
    {
      id: "2",
      name: "Code Helper",
      role: "Developer",
      status: "busy",
      description: "Assists with coding, debugging, and code reviews",
      tags: ["code", "debug", "review"],
      taskCount: 3,
      lastActive: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "3",
      name: "Writing Coach",
      role: "Editor",
      status: "online",
      description: "Helps improve writing and provides editorial feedback",
      tags: ["writing", "editing", "grammar"],
      taskCount: 2,
      lastActive: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "4",
      name: "Task Manager",
      role: "Coordinator",
      status: "paused",
      description: "Coordinates tasks and manages workflows",
      tags: ["tasks", "coordination", "planning"],
      taskCount: 8,
      lastActive: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

async function fetchAgent(id: string): Promise<Agent | null> {
  const agents = await fetchAgents();
  return agents.find((a) => a.id === id) ?? null;
}

async function fetchAgentsByStatus(
  status: Agent["status"]
): Promise<Agent[]> {
  const agents = await fetchAgents();
  return agents.filter((a) => a.status === status);
}

// Query hooks
export function useAgents() {
  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: fetchAgents,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: () => fetchAgent(id),
    enabled: !!id,
  });
}

export function useAgentsByStatus(status: Agent["status"]) {
  return useQuery({
    queryKey: agentKeys.list({ status }),
    queryFn: () => fetchAgentsByStatus(status),
    enabled: !!status,
  });
}
