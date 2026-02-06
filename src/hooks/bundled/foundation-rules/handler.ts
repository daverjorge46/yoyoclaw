import { readFile } from "fs/promises";
import { join } from "path";
import { isSubagentSessionKey } from "../../../routing/session-key.js";
import { resolveHookConfig } from "../../config.js";
import { isAgentBootstrapEvent, type HookHandler } from "../../hooks.js";

const HOOK_KEY = "foundation-rules";
const RULES_FILE = "CRITICAL-RULES.md";
const INJECTED_FILE_PATH = "CRITICAL-RULES-ACTIVE.md";

/**
 * Simple markdown parser that extracts sections and their content
 */
function parseMarkdownSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split("\n");
  let currentSection = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for heading (## Section Name)
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      // Save previous section if exists
      if (currentSection && currentContent.length > 0) {
        sections.set(currentSection.toLowerCase(), currentContent.join("\n").trim());
      }
      // Start new section
      currentSection = headingMatch[1].trim();
      currentContent = [];
    } else if (currentSection) {
      // Add line to current section
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    sections.set(currentSection.toLowerCase(), currentContent.join("\n").trim());
  }

  return sections;
}

/**
 * Filter and format rules based on context
 */
function buildContextualRules(
  sections: Map<string, string>,
  channel?: string,
): string {
  const parts: string[] = [];

  // Add channel-specific rules if we know the channel
  if (channel) {
    const channelRules = sections.get("channel rules");
    if (channelRules) {
      // Extract only the rule for this specific channel
      const lines = channelRules.split("\n");
      const relevantLines = lines.filter((line) => {
        const normalized = line.toLowerCase();
        return normalized.includes(channel.toLowerCase());
      });
      
      if (relevantLines.length > 0) {
        parts.push("## Channel Rules (Active)");
        parts.push(relevantLines.join("\n"));
      }
    }
  }

  // Add generic sections that should always be included
  const genericSections = [
    "banned phrases",
    "critical reminders",
    "formatting rules",
  ];

  for (const sectionName of genericSections) {
    const content = sections.get(sectionName);
    if (content) {
      parts.push(`## ${sectionName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`);
      parts.push(content);
    }
  }

  return parts.join("\n\n");
}

const foundationRulesHook: HookHandler = async (event) => {
  // Only handle agent:bootstrap events
  if (!isAgentBootstrapEvent(event)) {
    return;
  }

  const context = event.context;

  // Skip for subagents
  if (context.sessionKey && isSubagentSessionKey(context.sessionKey)) {
    return;
  }

  // Check if hook is enabled
  const cfg = context.cfg;
  const hookConfig = resolveHookConfig(cfg, HOOK_KEY);
  if (!hookConfig || hookConfig.enabled === false) {
    return;
  }

  // Verify we have required context
  const workspaceDir = context.workspaceDir;
  if (!workspaceDir || !Array.isArray(context.bootstrapFiles)) {
    return;
  }

  // Read CRITICAL-RULES.md from workspace
  const rulesPath = join(workspaceDir, RULES_FILE);
  let rulesContent: string;

  try {
    rulesContent = await readFile(rulesPath, "utf-8");
  } catch (err) {
    // File not found is OK - just skip silently
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    // Log other errors but don't fail
    console.warn(`[foundation-rules] Failed to read ${RULES_FILE}:`, err);
    return;
  }

  // Parse markdown sections
  const sections = parseMarkdownSections(rulesContent);
  
  if (sections.size === 0) {
    // No sections found, skip
    return;
  }

  // Build contextual rules based on channel
  const channel = context.commandSource; // e.g., "bluebubbles", "telegram"
  const activeRules = buildContextualRules(sections, channel);

  if (!activeRules) {
    // No relevant rules for this context
    return;
  }

  // Inject at END of bootstrap files for highest attention weight
  context.bootstrapFiles.push({
    path: INJECTED_FILE_PATH,
    content: `# Critical Rules (Active)\n\n${activeRules}\n\n---\n\nThese rules have the highest priority. Review them before responding.`,
  });

  console.debug(`[foundation-rules] Injected rules for channel: ${channel ?? "unknown"}`);
};

export default foundationRulesHook;
