"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Globe,
  FileText,
  FileCode2,
  Code,
  Calendar,
  Mail,
  Database,
  MessageSquare,
  Image,
  Terminal,
  Settings,
  Plus,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "communication" | "files" | "code" | "data" | "other";
  enabled: boolean;
  permissions?: string[];
}

interface AgentToolsTabProps {
  agentId: string;
}

const DEFAULT_TOOLS: Tool[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the internet for information and research",
    icon: Globe,
    category: "data",
    enabled: true,
    permissions: ["read"],
  },
  {
    id: "read-docs",
    name: "Read Documents",
    description: "Read and analyze PDF, Word, and text documents",
    icon: FileText,
    category: "files",
    enabled: true,
    permissions: ["read"],
  },
  {
    id: "write-files",
    name: "Write Files",
    description: "Create and edit files in the workspace",
    icon: FileCode2,
    category: "files",
    enabled: true,
    permissions: ["read", "write"],
  },
  {
    id: "code-exec",
    name: "Code Execution",
    description: "Execute code snippets in a sandboxed environment",
    icon: Terminal,
    category: "code",
    enabled: false,
    permissions: ["execute"],
  },
  {
    id: "calendar",
    name: "Calendar Access",
    description: "View and manage calendar events and scheduling",
    icon: Calendar,
    category: "communication",
    enabled: false,
    permissions: ["read", "write"],
  },
  {
    id: "email",
    name: "Email",
    description: "Send and read email messages",
    icon: Mail,
    category: "communication",
    enabled: false,
    permissions: ["read", "send"],
  },
  {
    id: "database",
    name: "Database Query",
    description: "Query and analyze database contents",
    icon: Database,
    category: "data",
    enabled: false,
    permissions: ["read"],
  },
  {
    id: "chat",
    name: "Chat Integration",
    description: "Send messages to chat platforms",
    icon: MessageSquare,
    category: "communication",
    enabled: false,
    permissions: ["send"],
  },
  {
    id: "image-gen",
    name: "Image Generation",
    description: "Generate images using AI models",
    icon: Image,
    category: "other",
    enabled: false,
    permissions: ["generate"],
  },
  {
    id: "code-analysis",
    name: "Code Analysis",
    description: "Analyze and review code repositories",
    icon: Code,
    category: "code",
    enabled: true,
    permissions: ["read", "analyze"],
  },
];

const categoryLabels: Record<Tool["category"], string> = {
  communication: "Communication",
  files: "Files & Documents",
  code: "Code & Development",
  data: "Data & Research",
  other: "Other Tools",
};

const categoryIcons: Record<Tool["category"], React.ElementType> = {
  communication: MessageSquare,
  files: FileText,
  code: Code,
  data: Database,
  other: Settings,
};

export function AgentToolsTab({ agentId }: AgentToolsTabProps) {
  void agentId;
  const [tools, setTools] = React.useState<Tool[]>(DEFAULT_TOOLS);

  const toggleTool = (toolId: string) => {
    setTools((prev) =>
      prev.map((tool) =>
        tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
      )
    );
  };

  const toolsByCategory = React.useMemo(() => {
    return tools.reduce(
      (acc, tool) => {
        if (!acc[tool.category]) {
          acc[tool.category] = [];
        }
        acc[tool.category].push(tool);
        return acc;
      },
      {} as Record<Tool["category"], Tool[]>
    );
  }, [tools]);

  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Tool Access</h3>
          <p className="text-sm text-muted-foreground">
            {enabledCount} of {tools.length} tools enabled
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Custom Tool
        </Button>
      </div>

      {/* Tool Categories */}
      {(Object.keys(categoryLabels) as Tool["category"][]).map((category) => {
        const categoryTools = toolsByCategory[category];
        if (!categoryTools || categoryTools.length === 0) return null;

        const CategoryIcon = categoryIcons[category];

        return (
          <Card key={category} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CategoryIcon className="h-4 w-4 text-primary" />
                {categoryLabels[category]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryTools.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 transition-colors",
                      tool.enabled
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/50 bg-card/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          tool.enabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{tool.name}</h4>
                          {tool.permissions && tool.permissions.length > 0 && (
                            <div className="flex gap-1">
                              {tool.permissions.map((perm) => (
                                <Badge
                                  key={perm}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={tool.enabled}
                      onCheckedChange={() => toggleTool(tool.id)}
                    />
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default AgentToolsTab;
