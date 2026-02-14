import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("config schema regressions", () => {
  it("accepts nested telegram groupPolicy overrides", () => {
    const res = validateConfigObject({
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              groupPolicy: "open",
              topics: {
                "42": {
                  groupPolicy: "disabled",
                },
              },
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts gateway.auth.rateLimit config (#16071)", () => {
    const res = validateConfigObject({
      gateway: {
        auth: {
          mode: "token",
          rateLimit: {
            maxAttempts: 10,
            windowMs: 60000,
            lockoutMs: 300000,
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts gateway.auth.rateLimit with exemptLoopback (#16071)", () => {
    const res = validateConfigObject({
      gateway: {
        auth: {
          rateLimit: {
            exemptLoopback: false,
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it('accepts memorySearch fallback "voyage"', () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          memorySearch: {
            fallback: "voyage",
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });
});
