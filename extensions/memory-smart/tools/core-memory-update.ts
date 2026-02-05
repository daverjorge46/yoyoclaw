/**
 * core_memory_update tool — edit the always-in-context core memory block.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { stringEnum } from "openclaw/plugin-sdk";
import type { CoreMemoryManager, CoreMemorySection, CoreMemoryUpdateMode } from "../store/core-memory.js";

const SECTIONS = ["identity", "human", "rules", "active_context", "relationships"] as const;
const MODES = ["replace", "append", "remove_line"] as const;

export function registerCoreMemoryUpdateTool(
  api: OpenClawPluginApi,
  coreMemory: CoreMemoryManager,
) {
  api.registerTool(
    {
      name: "core_memory_update",
      label: "Core Memory Update",
      description:
        "Update a section of core memory (always-in-context block). Use sparingly — only for durable, important information that should be available in every conversation.",
      parameters: Type.Object({
        section: stringEnum(SECTIONS as unknown as readonly string[], {
          description:
            "Section to update: identity, human, rules, active_context, relationships",
        }),
        content: Type.String({
          description:
            "New content for the section (or line to remove in remove_line mode)",
        }),
        mode: Type.Optional(
          stringEnum(MODES as unknown as readonly string[], {
            description: "Update mode: replace (default), append, or remove_line",
          }),
        ),
      }),
      async execute(_toolCallId, params) {
        const {
          section,
          content,
          mode = "replace",
        } = params as {
          section: string;
          content: string;
          mode?: string;
        };

        try {
          // Validate section
          if (!SECTIONS.includes(section as CoreMemorySection)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Invalid section: "${section}". Must be one of: ${SECTIONS.join(", ")}`,
                },
              ],
              details: { error: "invalid_section" },
            };
          }

          const result = await coreMemory.update(
            section as CoreMemorySection,
            content,
            mode as CoreMemoryUpdateMode,
          );

          if (!result.success) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: result.warning || "Failed to update core memory — exceeds token budget.",
                },
              ],
              details: {
                action: "rejected",
                tokenCount: result.tokenCount,
                reason: "token_budget_exceeded",
              },
            };
          }

          const responseText = result.warning
            ? `Core memory "${section}" updated (${mode}). ⚠️ ${result.warning}`
            : `Core memory "${section}" updated (${mode}). Token usage: ${result.tokenCount}`;

          return {
            content: [{ type: "text" as const, text: responseText }],
            details: {
              action: "updated",
              section,
              mode,
              tokenCount: result.tokenCount,
            },
          };
        } catch (err) {
          api.logger.error(`core_memory_update failed: ${String(err)}`);
          return {
            content: [
              {
                type: "text" as const,
                text: `Core memory update failed: ${String(err)}`,
              },
            ],
            details: { error: String(err) },
          };
        }
      },
    },
    { name: "core_memory_update" },
  );
}
