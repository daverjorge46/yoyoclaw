import { describe, expect, it } from "vitest";
import type { ClawdbotConfig } from "../config/config.js";
import { isTranscriptionEnabledForChat, isVoiceNote } from "./index.js";

describe("isVoiceNote", () => {
  it("returns true for audio/ogg", () => {
    expect(isVoiceNote("audio/ogg")).toBe(true);
  });

  it("returns true for audio/mpeg", () => {
    expect(isVoiceNote("audio/mpeg")).toBe(true);
  });

  it("returns true for audio/wav", () => {
    expect(isVoiceNote("audio/wav")).toBe(true);
  });

  it("returns false for video/mp4", () => {
    expect(isVoiceNote("video/mp4")).toBe(false);
  });

  it("returns false for image/jpeg", () => {
    expect(isVoiceNote("image/jpeg")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isVoiceNote(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isVoiceNote(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isVoiceNote("")).toBe(false);
  });
});

describe("isTranscriptionEnabledForChat", () => {
  const baseCfg: ClawdbotConfig = {
    voiceNotes: {
      transcription: {
        enabled: true,
        dmEnabled: true,
        groupEnabled: false,
      },
    },
  };

  describe("when transcription is disabled", () => {
    it("returns false for DM", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: { transcription: { enabled: false } },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "direct", "123@s.whatsapp.net"),
      ).toBe(false);
    });

    it("returns false when voiceNotes is undefined", () => {
      const cfg: ClawdbotConfig = {};
      expect(
        isTranscriptionEnabledForChat(cfg, "direct", "123@s.whatsapp.net"),
      ).toBe(false);
    });
  });

  describe("DM transcription", () => {
    it("is enabled by default when transcription is enabled", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: { transcription: { enabled: true } },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "direct", "123@s.whatsapp.net"),
      ).toBe(true);
    });

    it("can be explicitly disabled", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: { transcription: { enabled: true, dmEnabled: false } },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "direct", "123@s.whatsapp.net"),
      ).toBe(false);
    });
  });

  describe("group transcription", () => {
    it("is disabled by default", () => {
      expect(
        isTranscriptionEnabledForChat(baseCfg, "group", "123@g.us", "Family"),
      ).toBe(false);
    });

    it("allows all groups when groupEnabled is true and no allowlist", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: {
          transcription: { enabled: true, groupEnabled: true },
        },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "group", "123@g.us", "Family"),
      ).toBe(true);
    });

    it("allows groups by JID in allowlist", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: {
          transcription: {
            enabled: true,
            groupEnabled: true,
            groupAllowFrom: ["123@g.us"],
          },
        },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "group", "123@g.us", "Family"),
      ).toBe(true);
      expect(
        isTranscriptionEnabledForChat(cfg, "group", "456@g.us", "Work"),
      ).toBe(false);
    });

    it("allows groups by subject name in allowlist", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: {
          transcription: {
            enabled: true,
            groupEnabled: true,
            groupAllowFrom: ["Family Group"],
          },
        },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "group", "123@g.us", "Family Group"),
      ).toBe(true);
      expect(
        isTranscriptionEnabledForChat(cfg, "group", "456@g.us", "Work Group"),
      ).toBe(false);
    });

    it("allows all groups with wildcard in allowlist", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: {
          transcription: {
            enabled: true,
            groupEnabled: true,
            groupAllowFrom: ["*"],
          },
        },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "group", "123@g.us", "Any"),
      ).toBe(true);
    });

    it("rejects groups not in allowlist", () => {
      const cfg: ClawdbotConfig = {
        voiceNotes: {
          transcription: {
            enabled: true,
            groupEnabled: true,
            groupAllowFrom: ["Allowed Group"],
          },
        },
      };
      expect(
        isTranscriptionEnabledForChat(cfg, "group", "123@g.us", "Other Group"),
      ).toBe(false);
    });
  });
});
