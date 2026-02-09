import { describe, it, expect } from "vitest";
import type { VoiceCallConfig } from "../config.js";
import { AsteriskAriProvider, buildEndpoint } from "./asterisk-ari.js";

function createProvider() {
  const config = {
    enabled: true,
    provider: "asterisk-ari",
    outbound: { defaultMode: "conversation" },
    asteriskAri: {
      baseUrl: "http://127.0.0.1:8088",
      username: "user",
      password: "pass",
      app: "openclaw",
      rtpHost: "127.0.0.1",
      rtpPort: 12000,
      codec: "ulaw",
    },
  } as unknown as VoiceCallConfig;

  const managerStub = {
    processEvent: () => undefined,
    getCallByProviderCallId: () => undefined,
    getCall: () => undefined,
  } as any;

  return new AsteriskAriProvider({ config, manager: managerStub });
}

describe("AsteriskAriProvider", () => {
  it("verifyWebhook returns ok", () => {
    const provider = createProvider();
    const result = provider.verifyWebhook({
      headers: {},
      rawBody: "",
      url: "http://localhost",
      method: "POST",
    });
    expect(result.ok).toBe(true);
  });

  it("parseWebhookEvent returns empty events", () => {
    const provider = createProvider();
    const result = provider.parseWebhookEvent({
      headers: {},
      rawBody: "",
      url: "http://localhost",
      method: "POST",
    });
    expect(result.events).toHaveLength(0);
  });
});

describe("asterisk-ari buildEndpoint", () => {
  it("keeps explicit dialstrings", () => {
    expect(buildEndpoint("PJSIP/1000")).toBe("PJSIP/1000");
    expect(buildEndpoint("SIP/1234")).toBe("SIP/1234");
  });

  it("builds PJSIP endpoint without trunk", () => {
    expect(buildEndpoint("1000")).toBe("PJSIP/1000");
  });

  it("builds PJSIP endpoint with trunk", () => {
    expect(buildEndpoint("1000", "trunk-1")).toBe("PJSIP/trunk-1/1000");
  });
});
