/**
 * Session Continuation Integration for HEARTBEAT
 *
 * This module hooks into the HEARTBEAT system to automatically
 * check for session gaps and provide continuation prompts.
 */

import { CoreMemories } from "./index.js";
import { SessionContinuation, ContinuationResult } from "./session-continuation.js";

export interface SessionContinuationIntegration {
  enabled: boolean;
  lastSessionFile: string;
}

/**
 * Initialize session continuation
 * Should be called on every session start
 */
export async function initSessionContinuation(
  coreMemories: CoreMemories,
  userId: string = "default",
): Promise<string | undefined> {
  try {
    // Get last session timestamp from sessions.json
    const lastSession = await getLastSessionTime(userId);

    if (!lastSession) {
      // First session ever - no continuation needed
      return undefined;
    }

    // Check gap and build message
    const sc = new SessionContinuation(coreMemories);
    const result = await sc.checkSession(userId, lastSession.timestamp);

    // Update last session time
    await updateLastSessionTime(userId);

    return result.message;
  } catch (error) {
    // Fail silently - don't block session start
    console.error("Session continuation error:", error);
    return undefined;
  }
}

/**
 * HEARTBEAT hook - check if we should compress Flash to Warm
 */
export async function heartbeatSessionCheck(coreMemories: CoreMemories): Promise<void> {
  try {
    // Let CoreMemories handle compression
    await coreMemories.compressFlashToWarm?.();

    // Check for high-salience entries that might need attention
    const flash = await coreMemories.loadFlash?.();
    if (flash) {
      const highSalience = flash.entries?.filter(
        (e) => e.emotionalSalience > 0.8 && !e.userNotified,
      );

      // Could trigger notifications for these
      if (highSalience.length > 0) {
        console.log(`${highSalience.length} high-priority memories pending`);
      }
    }
  } catch (error) {
    console.error("HEARTBEAT session check error:", error);
  }
}

/**
 * CRON hook - smart reminders with context
 */
export async function getSmartReminderContext(
  coreMemories: CoreMemories,
  reminderTopic: string,
): Promise<string> {
  try {
    // Search Flash and Recent for related context
    const flashResults = await coreMemories.findByKeyword?.(reminderTopic);

    if (flashResults && flashResults.length > 0) {
      const context = flashResults
        .slice(0, 2)
        .map((r) => r.content)
        .join(" ");
      return `Context: ${context}`;
    }

    return "";
  } catch (error) {
    return "";
  }
}

// Internal helpers

interface SessionRecord {
  timestamp: number;
  gap?: number;
}

async function getLastSessionTime(userId: string): Promise<SessionRecord | null> {
  // This would read from sessions.json or similar
  // Implementation depends on OpenClaw's session storage
  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const sessionFile = path.join(
      process.env.OPENCLAW_WORKSPACE || ".",
      ".openclaw",
      "sessions.json",
    );

    const data = await fs.readFile(sessionFile, "utf-8");
    const sessions = JSON.parse(data);

    return sessions[userId] || null;
  } catch {
    return null;
  }
}

async function updateLastSessionTime(userId: string): Promise<void> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const sessionFile = path.join(
      process.env.OPENCLAW_WORKSPACE || ".",
      ".openclaw",
      "sessions.json",
    );

    let sessions: Record<string, SessionRecord> = {};

    try {
      const data = await fs.readFile(sessionFile, "utf-8");
      sessions = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    sessions[userId] = {
      timestamp: Date.now(),
    };

    await fs.mkdir(path.dirname(sessionFile), { recursive: true });
    await fs.writeFile(sessionFile, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error("Failed to update session time:", error);
  }
}

/**
 * Main entry point - call this when gateway/session starts
 */
export async function onSessionStart(
  coreMemories: CoreMemories,
  sendMessage: (msg: string) => void,
): Promise<void> {
  const message = await initSessionContinuation(coreMemories);

  if (message) {
    sendMessage(message);
  }
}
