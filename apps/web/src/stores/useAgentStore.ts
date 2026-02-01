import { create } from "zustand";

export type AgentStatus = "online" | "offline" | "busy" | "paused";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model?: string;
  runtime?: "pi" | "ccsdk";
  ccsdkProvider?: "anthropic" | "zai" | "openrouter";
  avatar?: string;
  status: AgentStatus;
  description?: string;
  tags?: string[];
  taskCount?: number;
  lastActive?: string;
}

export interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
}

export interface AgentActions {
  selectAgent: (id: string | null) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
}

export type AgentStore = AgentState & AgentActions;

export const useAgentStore = create<AgentStore>()((set) => ({
  // State
  agents: [],
  selectedAgentId: null,

  // Actions
  selectAgent: (id) => set({ selectedAgentId: id }),

  updateAgentStatus: (id, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, status } : agent
      ),
    })),

  setAgents: (agents) => set({ agents }),

  addAgent: (agent) =>
    set((state) => ({
      agents: [...state.agents, agent],
    })),

  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== id),
      selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
    })),
}));
