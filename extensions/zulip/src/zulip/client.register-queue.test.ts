import { describe, expect, it } from "vitest";
import type { ZulipClient } from "./client.js";
import { registerZulipQueue } from "./client.js";

describe("registerZulipQueue", () => {
  function makeClient(assertions: (path: string, init?: RequestInit) => void): ZulipClient {
    return {
      baseUrl: "https://zulip.example.com",
      authHeader: "xxx",
      fetchImpl: fetch,
      request: async (path: string, init?: RequestInit) => {
        assertions(path, init);
        return {
          result: "success",
          msg: "",
          queue_id: "q",
          last_event_id: 0,
        } as any;
      },
    };
  }

  it("uses all_public_streams=true when streams includes '*'", async () => {
    const client = makeClient((path, init) => {
      expect(path).toBe("/register");
      expect(init?.method).toBe("POST");
      const body = new URLSearchParams(String(init?.body ?? ""));
      expect(body.get("all_public_streams")).toBe("true");
      expect(body.has("narrow")).toBe(false);
    });

    await registerZulipQueue(client, { streams: ["*"] });
  });

  it("uses a stream narrow when exactly one stream is requested", async () => {
    const client = makeClient((path, init) => {
      expect(path).toBe("/register");
      const body = new URLSearchParams(String(init?.body ?? ""));
      expect(body.get("narrow")).toBe(JSON.stringify([["stream", "openclaw"]]));
      expect(body.has("all_public_streams")).toBe(false);
    });

    await registerZulipQueue(client, { streams: ["openclaw"] });
  });

  it("omits narrow when multiple streams are requested (Zulip narrows are ANDed)", async () => {
    const client = makeClient((path, init) => {
      expect(path).toBe("/register");
      const body = new URLSearchParams(String(init?.body ?? ""));
      expect(body.has("narrow")).toBe(false);
      expect(body.has("all_public_streams")).toBe(false);
    });

    await registerZulipQueue(client, { streams: ["build", "general", "openclaw", "research"] });
  });
});
