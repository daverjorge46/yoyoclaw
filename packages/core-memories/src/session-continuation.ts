import { CoreMemories } from "./index.js";

export interface SessionContinuationConfig {
  enabled: boolean;
  thresholds: {
    silent: number; // hours - no mention
    hint: number; // hours - brief context
    prompt: number; // hours - explicit prompt
  };
  prioritizeFlagged: boolean;
  maxMemoriesToShow: number;
}

export interface ContinuationResult {
  mode: "silent" | "hint" | "prompt";
  shouldPrompt: boolean;
  message?: string;
  context: {
    topMemories: any[];
    lastTopic?: string;
    unfinishedTasks: any[];
  };
}

export class SessionContinuation {
  private cm: CoreMemories;
  private config: SessionContinuationConfig;

  constructor(coreMemories: CoreMemories, config?: Partial<SessionContinuationConfig>) {
    this.cm = coreMemories;
    this.config = {
      enabled: true,
      thresholds: { silent: 2, hint: 6, prompt: 24 },
      prioritizeFlagged: true,
      maxMemoriesToShow: 3,
      ...config,
    };
  }

  /**
   * Check if we should continue a previous session
   * Called on session start (HEARTBEAT or gateway open)
   */
  async checkSession(userId: string, lastSessionTimestamp: number): Promise<ContinuationResult> {
    if (!this.config.enabled) {
      return {
        mode: "silent",
        shouldPrompt: false,
        context: { topMemories: [], unfinishedTasks: [] },
      };
    }

    const gapHours = (Date.now() - lastSessionTimestamp) / (1000 * 60 * 60);

    // Determine mode based on gap
    let mode: "silent" | "hint" | "prompt";
    if (gapHours < this.config.thresholds.silent) {
      mode = "silent";
    } else if (gapHours < this.config.thresholds.hint) {
      mode = "hint";
    } else {
      mode = "prompt";
    }

    // Get context from Flash layer (0-48h)
    const flash = await this.cm.loadFlash();

    // Filter high-priority memories
    let topMemories = flash.entries
      .filter((e) =>
        this.config.prioritizeFlagged ? e.userFlagged || e.emotionalSalience > 0.7 : true,
      )
      .sort((a, b) => b.emotionalSalience - a.emotionalSalience)
      .slice(0, this.config.maxMemoriesToShow);

    // Get unfinished tasks
    const unfinishedTasks = flash.entries
      .filter((e) => e.type === "action" && !e.completed)
      .slice(0, 2);

    // Get last topic from most recent entry
    const lastTopic = flash.entries[0]?.content;

    const context = { topMemories, lastTopic, unfinishedTasks };

    // Build message based on mode
    let message: string | undefined;
    if (mode === "hint") {
      message = this.buildHintMessage(context);
    } else if (mode === "prompt") {
      message = this.buildPromptMessage(context);
    }

    return {
      mode,
      shouldPrompt: mode === "prompt",
      message,
      context,
    };
  }

  /**
   * Build hint message (2-6 hour gap)
   * Brief, assumes continuity
   */
  private buildHintMessage(context: any): string | undefined {
    const { topMemories } = context;

    if (topMemories.length === 0) return undefined;

    // Pick the highest priority memory
    const top = topMemories[0];

    // Keep it conversational, not robotic
    if (top.emotionalSalience > 0.8) {
      return `👋 Hey! Still working on ${this.extractTopic(top.content)}?`;
    }

    return `👋 Hey!`; // Silent fallback
  }

  /**
   * Build prompt message (6+ hour gap)
   * Explicit continuation offer
   */
  private buildPromptMessage(context: any): string {
    const { topMemories, unfinishedTasks } = context;

    let message = `👋 Welcome back!\n\n`;

    // Show top memories
    if (topMemories.length > 0) {
      message += `**Last time we were working on:**\n`;
      topMemories.forEach((m) => {
        const icon = m.emotionalSalience > 0.8 ? "🎯" : "📝";
        message += `${icon} ${this.summarizeEntry(m)}\n`;
      });
      message += `\n`;
    }

    // Show unfinished tasks
    if (unfinishedTasks.length > 0) {
      message += `**Unfinished:**\n`;
      unfinishedTasks.forEach((t) => {
        message += `⏳ ${this.summarizeEntry(t)}\n`;
      });
      message += `\n`;
    }

    // Offer options
    if (topMemories.length > 0) {
      message += `Want to continue with ${this.extractTopic(topMemories[0].content)} or start fresh?`;
    } else {
      message += `What would you like to work on?`;
    }

    return message;
  }

  /**
   * Extract a concise topic from memory content
   */
  private extractTopic(content: string): string {
    // Simple extraction - could use LLM for better results
    const match = content.match(/(?:working on|building|launching|focus on)\s+([^\.\?\!]+)/i);
    return match ? match[1].trim() : content.substring(0, 40) + "...";
  }

  /**
   * Summarize a memory entry for display
   */
  private summarizeEntry(entry: any): string {
    let text = entry.content;
    if (text.length > 60) {
      text = text.substring(0, 57) + "...";
    }

    if (entry.emotionalSalience > 0.8) {
      text += " (high priority)";
    }

    return text;
  }
}

// Convenience function for HEARTBEAT integration
export async function getSessionContinuationMessage(
  coreMemories: CoreMemories,
  lastSessionTime: number,
): Promise<string | undefined> {
  const sc = new SessionContinuation(coreMemories);
  const result = await sc.checkSession("user", lastSessionTime);
  return result.message;
}
