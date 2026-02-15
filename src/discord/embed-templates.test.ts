import { describe, expect, it } from "vitest";
import {
  createAlertEmbed,
  createCronStatusEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createMemoryStatusEmbed,
  createSessionWarningEmbed,
  createStatusEmbed,
  createSuccessEmbed,
  createSystemStatusEmbed,
  EmbedColors,
  DISCORD_BLURPLE,
} from "./embed-templates.js";

describe("Discord Embed Templates", () => {
  describe("createStatusEmbed", () => {
    it("creates a success embed", () => {
      const embed = createStatusEmbed({
        title: "Task Complete",
        description: "Success message",
        status: "success",
      });

      expect(embed.title).toBe("Task Complete");
      expect(embed.description).toBe("Success message");
      expect(embed.color).toBe(EmbedColors.SUCCESS);
      expect(embed.timestamp).toBeDefined();
    });

    it("creates an error embed", () => {
      const embed = createStatusEmbed({
        title: "Task Failed",
        status: "error",
      });

      expect(embed.color).toBe(EmbedColors.ERROR);
    });

    it("includes fields when provided", () => {
      const embed = createStatusEmbed({
        title: "Status",
        status: "info",
        fields: [
          { name: "Field 1", value: "Value 1" },
          { name: "Field 2", value: "Value 2", inline: true },
        ],
      });

      expect(embed.fields).toHaveLength(2);
      expect(embed.fields?.[0].name).toBe("Field 1");
      expect(embed.fields?.[1].inline).toBe(true);
    });

    it("includes footer when provided", () => {
      const embed = createStatusEmbed({
        title: "Status",
        status: "info",
        footer: "Custom footer",
      });

      expect(embed.footer?.text).toBe("Custom footer");
    });
  });

  describe("createAlertEmbed", () => {
    it("creates a warning alert with details", () => {
      const embed = createAlertEmbed({
        title: "Warning",
        message: "Something needs attention",
        details: [
          { label: "Label 1", value: "Value 1" },
          { label: "Label 2", value: "Value 2" },
        ],
      });

      expect(embed.title).toBe("⚠️ Warning");
      expect(embed.color).toBe(EmbedColors.WARNING);
      expect(embed.fields).toHaveLength(2);
    });

    it("includes action field when provided", () => {
      const embed = createAlertEmbed({
        title: "Action Required",
        message: "Please do something",
        action: "Run `/new` command",
      });

      expect(embed.fields?.some((f) => f.name === "📋 Action Required")).toBe(true);
    });
  });

  describe("createSystemStatusEmbed", () => {
    it("creates a healthy status embed", () => {
      const embed = createSystemStatusEmbed({
        title: "System Health",
        status: "healthy",
        metrics: [{ name: "CPU", value: "45%" }],
      });

      expect(embed.title).toContain("✅");
      expect(embed.color).toBe(EmbedColors.SUCCESS);
    });

    it("creates a degraded status embed", () => {
      const embed = createSystemStatusEmbed({
        title: "System Health",
        status: "degraded",
        metrics: [],
      });

      expect(embed.title).toContain("⚠️");
      expect(embed.color).toBe(EmbedColors.WARNING);
    });

    it("creates a down status embed", () => {
      const embed = createSystemStatusEmbed({
        title: "System Health",
        status: "down",
        metrics: [],
      });

      expect(embed.title).toContain("🚨");
      expect(embed.color).toBe(EmbedColors.ERROR);
    });

    it("includes default footer", () => {
      const embed = createSystemStatusEmbed({
        title: "System",
        status: "healthy",
        metrics: [],
      });

      expect(embed.footer?.text).toBe("OpenClaw System Monitor");
    });
  });

  describe("createSessionWarningEmbed", () => {
    it("creates a session warning with all details", () => {
      const embed = createSessionWarningEmbed({
        sessionId: "cb11d4bd-7db5-4e8a-a9a9-5d10a584fc34",
        size: "773KB",
        issue: "Session frozen for 9 minutes",
        recommendation: "Use `/new` command",
      });

      expect(embed.title).toBe("⚠️ Large Session Warning");
      expect(embed.description).toBe("Session frozen for 9 minutes");
      expect(embed.color).toBe(EmbedColors.WARNING);
      expect(embed.fields?.some((f) => f.label === "Size")).toBeTruthy();
    });
  });

  describe("createCronStatusEmbed", () => {
    it("creates a healthy cron status when all jobs ok", () => {
      const embed = createCronStatusEmbed({
        jobs: [
          { name: "Observer", status: "ok", nextRun: "in 12m" },
          { name: "Maintenance", status: "ok", nextRun: "in 15h" },
        ],
      });

      expect(embed.title).toContain("Cron Jobs Status");
      expect(embed.color).toBe(EmbedColors.SUCCESS);
      expect(embed.fields).toHaveLength(2);
    });

    it("creates a degraded status when any job not ok", () => {
      const embed = createCronStatusEmbed({
        jobs: [
          { name: "Observer", status: "ok", nextRun: "in 12m" },
          { name: "Maintenance", status: "error" },
        ],
      });

      expect(embed.color).toBe(EmbedColors.WARNING);
    });
  });

  describe("createMemoryStatusEmbed", () => {
    it("creates a memory status embed with all metrics", () => {
      const embed = createMemoryStatusEmbed({
        neurons: 90,
        synapses: 219,
        fibers: 34,
        observations: { lines: 437, size: "26KB" },
        sessions: { count: 43, size: "3.2M" },
      });

      expect(embed.title).toBe("🧠 Memory System Status");
      expect(embed.description).toBe("NeuralMemory + SQLite Dual Storage");
      expect(embed.color).toBe(EmbedColors.INFO);
      expect(embed.fields).toHaveLength(3);
      expect(embed.footer?.text).toBe("Hybrid Vector + BM25 Search");
    });
  });

  describe("createInfoEmbed", () => {
    it("creates a generic info embed", () => {
      const embed = createInfoEmbed({
        title: "Information",
        description: "Some info",
        fields: [{ name: "Field", value: "Value" }],
      });

      expect(embed.title).toBe("Information");
      expect(embed.color).toBe(EmbedColors.INFO);
    });

    it("allows custom color", () => {
      const embed = createInfoEmbed({
        title: "Custom",
        fields: [],
        color: 0xFF0000,
      });

      expect(embed.color).toBe(0xFF0000);
    });

    it("includes thumbnail when provided", () => {
      const embed = createInfoEmbed({
        title: "Info",
        fields: [],
        thumbnail: "https://example.com/image.png",
      });

      expect(embed.thumbnail?.url).toBe("https://example.com/image.png");
    });
  });

  describe("createErrorEmbed", () => {
    it("creates an error embed with error message", () => {
      const embed = createErrorEmbed({
        title: "Error Occurred",
        error: "Something went wrong",
      });

      expect(embed.title).toBe("🚨 Error Occurred");
      expect(embed.color).toBe(EmbedColors.ERROR);
      expect(embed.fields?.[0].name).toBe("Error");
    });

    it("includes context when provided", () => {
      const embed = createErrorEmbed({
        title: "Error",
        error: "Failed",
        context: {
          Endpoint: "https://api.example.com",
          Timeout: "5000ms",
        },
      });

      expect(embed.fields?.length).toBeGreaterThan(1);
    });

    it("includes stack trace when provided", () => {
      const embed = createErrorEmbed({
        title: "Error",
        error: "Failed",
        stack: "Error: Failed\n  at line 42",
      });

      expect(embed.fields?.some((f) => f.name === "Stack Trace")).toBe(true);
    });
  });

  describe("createSuccessEmbed", () => {
    it("creates a success confirmation embed", () => {
      const embed = createSuccessEmbed({
        title: "Success",
        message: "Operation completed",
      });

      expect(embed.title).toBe("✅ Success");
      expect(embed.description).toBe("Operation completed");
      expect(embed.color).toBe(EmbedColors.SUCCESS);
    });

    it("includes details when provided", () => {
      const embed = createSuccessEmbed({
        title: "Success",
        message: "Done",
        details: {
          Duration: "2.3s",
          Items: "42",
        },
      });

      expect(embed.fields).toHaveLength(2);
    });
  });

  describe("Color constants", () => {
    it("exports correct color values", () => {
      expect(EmbedColors.SUCCESS).toBe(0x00D26A);
      expect(EmbedColors.INFO).toBe(0x5865F2);
      expect(EmbedColors.WARNING).toBe(0xFEE75C);
      expect(EmbedColors.ERROR).toBe(0xED4245);
      expect(EmbedColors.NEUTRAL).toBe(0x99AAB5);
      expect(DISCORD_BLURPLE).toBe(0x5865F2);
    });
  });
});
