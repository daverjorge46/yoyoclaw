import { describe, it, expectTypeOf } from "vitest";
import type { BaseProbeResult, BaseTokenResolution } from "./types.js";
import type { TelegramProbe } from "../../telegram/probe.js";
import type { DiscordProbe } from "../../discord/probe.js";
import type { SlackProbe } from "../../slack/probe.js";
import type { SignalProbe } from "../../signal/probe.js";

describe("BaseProbeResult assignability", () => {
  it("TelegramProbe satisfies BaseProbeResult", () => {
    expectTypeOf<TelegramProbe>().toMatchTypeOf<BaseProbeResult>();
  });

  it("DiscordProbe satisfies BaseProbeResult", () => {
    expectTypeOf<DiscordProbe>().toMatchTypeOf<BaseProbeResult>();
  });

  it("SlackProbe satisfies BaseProbeResult", () => {
    expectTypeOf<SlackProbe>().toMatchTypeOf<BaseProbeResult>();
  });

  it("SignalProbe satisfies BaseProbeResult", () => {
    expectTypeOf<SignalProbe>().toMatchTypeOf<BaseProbeResult>();
  });
});
