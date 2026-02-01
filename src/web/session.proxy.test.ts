import { describe, expect, it } from "vitest";

describe("WhatsApp proxy support", () => {
  it("reads HTTPS_PROXY environment variable", () => {
    const originalProxy = process.env.HTTPS_PROXY;
    try {
      process.env.HTTPS_PROXY = "http://127.0.0.1:8080";
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      expect(proxyUrl).toBe("http://127.0.0.1:8080");
    } finally {
      if (originalProxy) {
        process.env.HTTPS_PROXY = originalProxy;
      } else {
        delete process.env.HTTPS_PROXY;
      }
    }
  });

  it("reads HTTP_PROXY environment variable when HTTPS_PROXY is not set", () => {
    const originalHttpsProxy = process.env.HTTPS_PROXY;
    const originalHttpProxy = process.env.HTTP_PROXY;
    try {
      delete process.env.HTTPS_PROXY;
      process.env.HTTP_PROXY = "http://127.0.0.1:1080";
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      expect(proxyUrl).toBe("http://127.0.0.1:1080");
    } finally {
      if (originalHttpsProxy) {
        process.env.HTTPS_PROXY = originalHttpsProxy;
      }
      if (originalHttpProxy) {
        process.env.HTTP_PROXY = originalHttpProxy;
      } else {
        delete process.env.HTTP_PROXY;
      }
    }
  });

  it("returns undefined when no proxy environment variables are set", () => {
    const originalHttpsProxy = process.env.HTTPS_PROXY;
    const originalHttpProxy = process.env.HTTP_PROXY;
    try {
      delete process.env.HTTPS_PROXY;
      delete process.env.HTTP_PROXY;
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      expect(proxyUrl).toBeUndefined();
    } finally {
      if (originalHttpsProxy) {
        process.env.HTTPS_PROXY = originalHttpsProxy;
      }
      if (originalHttpProxy) {
        process.env.HTTP_PROXY = originalHttpProxy;
      }
    }
  });
});
