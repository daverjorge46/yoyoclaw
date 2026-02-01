import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uuidv7 } from "@/lib/ids";
import type { Agent, AgentStatus } from "../queries/useAgents";
import { agentKeys } from "../queries/useAgents";

// Mock API functions - replace with real API calls later
async function createAgent(
  data: Omit<Agent, "id" | "lastActive">
): Promise<Agent> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    ...data,
    id: uuidv7(),
    lastActive: new Date().toISOString(),
  };
}

async function updateAgent(
  data: Partial<Agent> & { id: string }
): Promise<Agent> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  // In real implementation, this would merge with existing data
  return data as Agent;
}

async function deleteAgent(id: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return id;
}

async function updateAgentStatus(
  id: string,
  status: AgentStatus
): Promise<{ id: string; status: AgentStatus }> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { id, status };
}

// Mutation hooks
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgent,
    onSuccess: (newAgent) => {
      // Optimistically add to cache
      queryClient.setQueryData<Agent[]>(agentKeys.lists(), (old) =>
        old ? [...old, newAgent] : [newAgent]
      );
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
      toast.success("Agent created successfully");
    },
    onError: (error) => {
      toast.error(
        `Failed to create agent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgent,
    onMutate: async (updatedAgent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: agentKeys.detail(updatedAgent.id),
      });

      // Snapshot previous value
      const previousAgent = queryClient.getQueryData<Agent>(
        agentKeys.detail(updatedAgent.id)
      );

      // Optimistically update
      queryClient.setQueryData<Agent>(
        agentKeys.detail(updatedAgent.id),
        (old) => (old ? { ...old, ...updatedAgent } : undefined)
      );

      return { previousAgent };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      toast.success("Agent updated successfully");
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousAgent) {
        queryClient.setQueryData(
          agentKeys.detail(variables.id),
          context.previousAgent
        );
      }
      toast.error(
        `Failed to update agent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAgent,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: agentKeys.lists() });

      const previousAgents = queryClient.getQueryData<Agent[]>(
        agentKeys.lists()
      );

      // Optimistically remove from list
      queryClient.setQueryData<Agent[]>(agentKeys.lists(), (old) =>
        old ? old.filter((agent) => agent.id !== id) : []
      );

      return { previousAgents };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
      toast.success("Agent deleted successfully");
    },
    onError: (error, _, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(agentKeys.lists(), context.previousAgents);
      }
      toast.error(
        `Failed to delete agent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    },
  });
}

export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AgentStatus }) =>
      updateAgentStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: agentKeys.detail(id) });

      const previousAgent = queryClient.getQueryData<Agent>(
        agentKeys.detail(id)
      );

      queryClient.setQueryData<Agent>(agentKeys.detail(id), (old) =>
        old ? { ...old, status } : undefined
      );

      // Also update in list
      queryClient.setQueryData<Agent[]>(agentKeys.lists(), (old) =>
        old
          ? old.map((agent) =>
              agent.id === id ? { ...agent, status } : agent
            )
          : []
      );

      return { previousAgent };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(variables.id) });
      toast.success(`Agent status updated to ${variables.status}`);
    },
    onError: (_error, variables, context) => {
      if (context?.previousAgent) {
        queryClient.setQueryData(
          agentKeys.detail(variables.id),
          context.previousAgent
        );
      }
      toast.error("Failed to update agent status");
    },
  });
}
