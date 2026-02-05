import { describe, it, expect, beforeEach, vi } from "vitest";
import type { CoreConfig } from "./types.js";
import { xmppMessageActions, setXmppClientsRegistry } from "./actions.js";
import { XmppClient } from "./client.js";

describe("XMPP Message Actions", () => {
  let mockClient: XmppClient;
  let mockSendReaction: ReturnType<typeof vi.fn>;
  let mockConfig: CoreConfig;

  beforeEach(() => {
    mockSendReaction = vi.fn().mockResolvedValue(undefined);
    // Create mock client
    mockClient = {
      sendReaction: mockSendReaction,
    } as unknown as XmppClient;

    // Setup registry with mock client
    const registry = new Map<string, XmppClient>();
    registry.set("default", mockClient);
    setXmppClientsRegistry(registry);

    // Mock config with reactions enabled
    mockConfig = {
      channels: {
        xmpp: {
          enabled: true,
          jid: "test@example.com",
          password: "password",
          server: "example.com",
          actions: {
            reactions: true,
          },
        },
      },
    } as CoreConfig;
  });

  describe("react action - emoji parameter handling", () => {
    it("should accept single emoji as string", async () => {
      const result = await xmppMessageActions.handleAction({
        action: "react",
        params: {
          to: "user@example.com",
          messageId: "msg-123",
          emoji: "👍",
        },
        cfg: mockConfig,
        accountId: "default",
      });

      expect(mockSendReaction).toHaveBeenCalledWith("user@example.com", "msg-123", ["👍"], "chat");
      expect(result.details).toEqual({ ok: true, added: "👍" });
    });

    it("should accept multiple emojis as array", async () => {
      const result = await xmppMessageActions.handleAction({
        action: "react",
        params: {
          to: "user@example.com",
          messageId: "msg-123",
          emoji: ["👍", "❤️", "🎉"],
        },
        cfg: mockConfig,
        accountId: "default",
      });

      expect(mockSendReaction).toHaveBeenCalledWith(
        "user@example.com",
        "msg-123",
        ["👍", "❤️", "🎉"],
        "chat",
      );
      expect(result.details).toEqual({ ok: true, added: "👍 ❤️ 🎉" });
    });

    it("should reject empty emoji parameter", async () => {
      await expect(
        xmppMessageActions.handleAction({
          action: "react",
          params: {
            to: "user@example.com",
            messageId: "msg-123",
            // emoji missing
          },
          cfg: mockConfig,
          accountId: "default",
        }),
      ).rejects.toThrow("emoji parameter required");
    });

    it("should reject empty string emoji", async () => {
      await expect(
        xmppMessageActions.handleAction({
          action: "react",
          params: {
            to: "user@example.com",
            messageId: "msg-123",
            emoji: "",
          },
          cfg: mockConfig,
          accountId: "default",
        }),
      ).rejects.toThrow("emoji parameter required");
    });

    it("should reject array with empty string", async () => {
      await expect(
        xmppMessageActions.handleAction({
          action: "react",
          params: {
            to: "user@example.com",
            messageId: "msg-123",
            emoji: ["👍", "", "🎉"],
          },
          cfg: mockConfig,
          accountId: "default",
        }),
      ).rejects.toThrow("emoji must be a non-empty string or array of non-empty strings");
    });

    it("should reject non-string emoji in array", async () => {
      await expect(
        xmppMessageActions.handleAction({
          action: "react",
          params: {
            to: "user@example.com",
            messageId: "msg-123",
            emoji: ["👍", 123, "🎉"],
          },
          cfg: mockConfig,
          accountId: "default",
        }),
      ).rejects.toThrow("emoji must be a non-empty string or array of non-empty strings");
    });

    it("should handle remove with multiple emojis", async () => {
      const result = await xmppMessageActions.handleAction({
        action: "react",
        params: {
          to: "user@example.com",
          messageId: "msg-123",
          emoji: ["👍", "❤️"],
          remove: true,
        },
        cfg: mockConfig,
        accountId: "default",
      });

      expect(mockSendReaction).toHaveBeenCalledWith("user@example.com", "msg-123", [], "chat");
      expect(result.details).toEqual({ ok: true, removed: "👍 ❤️" });
    });

    it("should use groupchat type for MUC rooms", async () => {
      const result = await xmppMessageActions.handleAction({
        action: "react",
        params: {
          to: "room@conference.example.com",
          messageId: "msg-123",
          emoji: "👍",
        },
        cfg: mockConfig,
        accountId: "default",
      });

      expect(mockSendReaction).toHaveBeenCalledWith(
        "room@conference.example.com",
        "msg-123",
        ["👍"],
        "groupchat",
      );
      expect(result.details).toEqual({ ok: true, added: "👍" });
    });
  });

  describe("listActions", () => {
    it("should include react when reactions enabled", () => {
      const actions = xmppMessageActions.listActions({ cfg: mockConfig });
      expect(actions).toContain("send");
      expect(actions).toContain("react");
    });

    it("should not include react when reactions disabled", () => {
      const disabledConfig = {
        channels: {
          xmpp: {
            enabled: true,
            jid: "test@example.com",
            password: "password",
            server: "example.com",
            actions: {
              reactions: false,
            },
          },
        },
      } as CoreConfig;

      const actions = xmppMessageActions.listActions({ cfg: disabledConfig });
      expect(actions).toContain("send");
      expect(actions).not.toContain("react");
    });

    it("should return empty when xmpp not configured", () => {
      const emptyConfig = { channels: {} } as CoreConfig;
      const actions = xmppMessageActions.listActions({ cfg: emptyConfig });
      expect(actions).toEqual([]);
    });
  });
});
