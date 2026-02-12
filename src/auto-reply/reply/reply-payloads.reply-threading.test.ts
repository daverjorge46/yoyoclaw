import { describe, expect, it } from "vitest";
import { applyReplyTagsToPayload, applyReplyThreading } from "./reply-payloads.js";

describe("applyReplyTagsToPayload", () => {
  it("sets replyToId from currentMessageId when replyToCurrent is true", () => {
    const result = applyReplyTagsToPayload({ text: "hello", replyToCurrent: true }, "msg-123");
    expect(result.replyToId).toBe("msg-123");
  });

  it("does not set replyToId when replyToCurrent is falsy", () => {
    const result = applyReplyTagsToPayload({ text: "hello" }, "msg-123");
    expect(result.replyToId).toBeUndefined();
  });

  it("does not overwrite existing replyToId when replyToCurrent is true", () => {
    const result = applyReplyTagsToPayload(
      { text: "hello", replyToCurrent: true, replyToId: "existing-456" },
      "msg-123",
    );
    expect(result.replyToId).toBe("existing-456");
  });
});

describe("applyReplyThreading", () => {
  it("auto-threads payloads when replyToMode is 'all'", () => {
    const result = applyReplyThreading({
      payloads: [{ text: "first" }, { text: "second" }],
      replyToMode: "all",
      currentMessageId: "msg-100",
    });
    expect(result).toHaveLength(2);
    expect(result[0].replyToId).toBe("msg-100");
    expect(result[1].replyToId).toBe("msg-100");
  });

  it("auto-threads only the first payload when replyToMode is 'first'", () => {
    const result = applyReplyThreading({
      payloads: [{ text: "first" }, { text: "second" }],
      replyToMode: "first",
      currentMessageId: "msg-100",
    });
    expect(result).toHaveLength(2);
    expect(result[0].replyToId).toBe("msg-100");
    expect(result[1].replyToId).toBeUndefined();
  });

  it("does not auto-thread payloads when replyToMode is 'off'", () => {
    const result = applyReplyThreading({
      payloads: [{ text: "first" }, { text: "second" }],
      replyToMode: "off",
      currentMessageId: "msg-100",
    });
    expect(result).toHaveLength(2);
    expect(result[0].replyToId).toBeUndefined();
    expect(result[1].replyToId).toBeUndefined();
  });

  it("does not set replyToId when currentMessageId is undefined", () => {
    const result = applyReplyThreading({
      payloads: [{ text: "hello" }],
      replyToMode: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0].replyToId).toBeUndefined();
  });

  it("filters out empty payloads", () => {
    const result = applyReplyThreading({
      payloads: [{ text: "" }, { text: "hello" }],
      replyToMode: "all",
      currentMessageId: "msg-100",
    });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("hello");
    expect(result[0].replyToId).toBe("msg-100");
  });

  it("preserves existing replyToId set by LLM tags", () => {
    const result = applyReplyThreading({
      payloads: [{ text: "hello", replyToId: "custom-id" }],
      replyToMode: "all",
      currentMessageId: "msg-100",
    });
    expect(result).toHaveLength(1);
    // replyToCurrent=true is injected, but applyReplyTagsToPayload
    // does not overwrite an existing replyToId
    expect(result[0].replyToId).toBe("custom-id");
  });
});
