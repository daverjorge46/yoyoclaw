import { describe, expect, it } from "vitest";
import {
  buildTelegramThreadParams,
  buildTypingThreadParams,
  describeForwardOrigin,
} from "./helpers.js";
import type { TelegramMessage } from "./types.js";

describe("buildTelegramThreadParams", () => {
  it("omits General topic thread id for message sends", () => {
    expect(buildTelegramThreadParams(1)).toBeUndefined();
  });

  it("includes non-General topic thread ids", () => {
    expect(buildTelegramThreadParams(99)).toEqual({ message_thread_id: 99 });
  });

  it("normalizes thread ids to integers", () => {
    expect(buildTelegramThreadParams(42.9)).toEqual({ message_thread_id: 42 });
  });
});

describe("buildTypingThreadParams", () => {
  it("returns undefined when no thread id is provided", () => {
    expect(buildTypingThreadParams(undefined)).toBeUndefined();
  });

  it("includes General topic thread id for typing indicators", () => {
    expect(buildTypingThreadParams(1)).toEqual({ message_thread_id: 1 });
  });

  it("normalizes thread ids to integers", () => {
    expect(buildTypingThreadParams(42.9)).toEqual({ message_thread_id: 42 });
  });
});

describe("describeForwardOrigin", () => {
  it("prefers forward_origin user details", () => {
    const msg = {
      forward_origin: {
        type: "user",
        sender_user: { first_name: "Ada", last_name: "Lovelace", username: "ada", id: 10 },
        date: 1700000000,
      },
    } as unknown as TelegramMessage;

    expect(describeForwardOrigin(msg)).toEqual({
      source: "Ada Lovelace (@ada)",
      date: 1700000000,
    });
  });

  it("uses forward_origin hidden_user name", () => {
    const msg = {
      forward_origin: { type: "hidden_user", sender_user_name: "Hidden", date: 1700000001 },
    } as unknown as TelegramMessage;

    expect(describeForwardOrigin(msg)).toEqual({
      source: "Hidden",
      date: 1700000001,
    });
  });

  it("falls back to forward_sender_name for legacy payloads", () => {
    const msg = {
      forward_sender_name: "Legacy Sender",
      forward_date: 1700000002,
    } as unknown as TelegramMessage;

    expect(describeForwardOrigin(msg)).toEqual({
      source: "Legacy Sender",
      date: 1700000002,
    });
  });

  it("includes forward_signature for legacy chat forwards", () => {
    const msg = {
      forward_from_chat: { title: "Ops Channel", id: 55 },
      forward_signature: "Alice",
      forward_date: 1700000003,
    } as unknown as TelegramMessage;

    expect(describeForwardOrigin(msg)).toEqual({
      source: "Ops Channel (Alice)",
      date: 1700000003,
    });
  });
});
