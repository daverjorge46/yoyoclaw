import { describe, expect, it } from "vitest";
import { resolveChannelMediaMaxBytes } from "./media-limits.js";

const MB = 1024 * 1024;

function makeCfg(agentMediaMaxMb?: number) {
  return {
    agents: agentMediaMaxMb != null ? { defaults: { mediaMaxMb: agentMediaMaxMb } } : undefined,
  } as Parameters<typeof resolveChannelMediaMaxBytes>[0]["cfg"];
}

describe("resolveChannelMediaMaxBytes", () => {
  it("returns channel-specific limit when set", () => {
    const result = resolveChannelMediaMaxBytes({
      cfg: makeCfg(10),
      resolveChannelLimitMb: () => 5,
    });
    expect(result).toBe(5 * MB);
  });

  it("returns agent default when channel limit is undefined", () => {
    const result = resolveChannelMediaMaxBytes({
      cfg: makeCfg(3),
      resolveChannelLimitMb: () => undefined,
    });
    expect(result).toBe(3 * MB);
  });

  it("returns undefined when no limits are configured", () => {
    const result = resolveChannelMediaMaxBytes({
      cfg: makeCfg(),
      resolveChannelLimitMb: () => undefined,
    });
    expect(result).toBeUndefined();
  });

  it("returns 0 bytes when channel limit is 0 (media disabled)", () => {
    const result = resolveChannelMediaMaxBytes({
      cfg: makeCfg(10),
      resolveChannelLimitMb: () => 0,
    });
    expect(result).toBe(0);
  });

  it("returns 0 bytes when agent default mediaMaxMb is 0", () => {
    const result = resolveChannelMediaMaxBytes({
      cfg: makeCfg(0),
      resolveChannelLimitMb: () => undefined,
    });
    expect(result).toBe(0);
  });
});
