import { describe, expect, it } from "vitest";
import {
  formatOutboundPayloadLog,
  normalizeOutboundPayloads,
  normalizeOutboundPayloadsForJson,
} from "./payloads.js";

describe("normalizeOutboundPayloadsForJson", () => {
  it("normalizes payloads with mediaUrl and mediaUrls", () => {
    expect(
      normalizeOutboundPayloadsForJson([
        { text: "hi" },
        { text: "photo", mediaUrl: "https://x.test/a.jpg" },
        { text: "multi", mediaUrls: ["https://x.test/1.png"] },
      ]),
    ).toEqual([
      { text: "hi", mediaUrl: null, mediaUrls: undefined, channelData: undefined },
      {
        text: "photo",
        mediaUrl: "https://x.test/a.jpg",
        mediaUrls: ["https://x.test/a.jpg"],
        channelData: undefined,
      },
      {
        text: "multi",
        mediaUrl: null,
        mediaUrls: ["https://x.test/1.png"],
        channelData: undefined,
      },
    ]);
  });

  it("keeps mediaUrl null for multi MEDIA tags", () => {
    expect(
      normalizeOutboundPayloadsForJson([
        {
          text: "MEDIA:https://x.test/a.png\nMEDIA:https://x.test/b.png",
        },
      ]),
    ).toEqual([
      {
        text: "",
        mediaUrl: null,
        mediaUrls: ["https://x.test/a.png", "https://x.test/b.png"],
        channelData: undefined,
      },
    ]);
  });
});

describe("normalizeOutboundPayloads", () => {
  it("keeps channelData-only payloads", () => {
    const channelData = { line: { flexMessage: { altText: "Card", contents: {} } } };
    const normalized = normalizeOutboundPayloads([{ channelData }]);
    expect(normalized).toEqual([{ text: "", mediaUrls: [], channelData }]);
  });
});

describe("formatOutboundPayloadLog", () => {
  it("trims trailing text and appends media lines", () => {
    expect(
      formatOutboundPayloadLog({
        text: "hello  ",
        mediaUrls: ["https://x.test/a.png", "https://x.test/b.png"],
      }),
    ).toBe("hello\nMEDIA:https://x.test/a.png\nMEDIA:https://x.test/b.png");
  });

  it("logs media-only payloads", () => {
    expect(
      formatOutboundPayloadLog({
        text: "",
        mediaUrls: ["https://x.test/a.png"],
      }),
    ).toBe("MEDIA:https://x.test/a.png");
  });
});

describe("normalizeOutboundPayloads — NO_REPLY suppression (#14759)", () => {
  it("suppresses payloads with exact NO_REPLY text", () => {
    const result = normalizeOutboundPayloads([{ text: "NO_REPLY" }]);
    expect(result).toEqual([]);
  });

  it("suppresses payloads with whitespace-padded NO_REPLY", () => {
    expect(normalizeOutboundPayloads([{ text: "  NO_REPLY  " }])).toEqual([]);
    expect(normalizeOutboundPayloads([{ text: "\nNO_REPLY\n" }])).toEqual([]);
    expect(normalizeOutboundPayloads([{ text: "\t NO_REPLY " }])).toEqual([]);
  });

  it("keeps NO_REPLY payload when media is attached", () => {
    const result = normalizeOutboundPayloads([
      { text: "NO_REPLY", mediaUrl: "https://example.com/img.png" },
    ]);
    expect(result.length).toBe(1);
    expect(result[0].mediaUrls).toEqual(["https://example.com/img.png"]);
  });

  it("keeps normal text payloads", () => {
    const result = normalizeOutboundPayloads([{ text: "Hello world" }]);
    expect(result).toEqual([{ text: "Hello world", mediaUrls: [] }]);
  });

  it("suppresses NO_REPLY among mixed payloads", () => {
    const result = normalizeOutboundPayloads([
      { text: "Hello" },
      { text: "NO_REPLY" },
      { text: "World" },
    ]);
    expect(result).toEqual([
      { text: "Hello", mediaUrls: [] },
      { text: "World", mediaUrls: [] },
    ]);
  });
});
