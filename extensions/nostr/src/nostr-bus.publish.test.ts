import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const TEST_HEX_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const TEST_PUBKEY = "f".repeat(64);
const TEST_PUBKEY_2 = "a".repeat(64);

let lastPool: {
  publish: ReturnType<typeof vi.fn>;
  subscribeMany: ReturnType<typeof vi.fn>;
} | null = null;

vi.mock("nostr-tools", async () => {
  const actual = await vi.importActual<typeof import("nostr-tools")>("nostr-tools");
  class MockPool {
    publish = vi.fn();
    subscribeMany = vi.fn(() => ({ close: vi.fn() }));
    constructor() {
      lastPool = this as unknown as {
        publish: ReturnType<typeof vi.fn>;
        subscribeMany: ReturnType<typeof vi.fn>;
      };
    }
  }
  return {
    ...actual,
    SimplePool: MockPool,
  };
});

vi.mock("nostr-tools/nip04", async () => {
  return {
    encrypt: vi.fn(async () => "cipher"),
    decrypt: vi.fn(async () => "plain"),
  };
});

vi.mock("./nostr-state-store.js", () => {
  return {
    readNostrBusState: vi.fn(async () => null),
    writeNostrBusState: vi.fn(async () => undefined),
    computeSinceTimestamp: vi.fn(() => 0),
    readNostrProfileState: vi.fn(async () => null),
    writeNostrProfileState: vi.fn(async () => undefined),
  };
});

describe("startNostrBus publish handling", () => {
  it("awaits publish rejections for DMs without unhandled rejection", async () => {
    const { startNostrBus } = await import("./nostr-bus.js");
    const onError = vi.fn();
    const bus = await startNostrBus({
      privateKey: TEST_HEX_KEY,
      relays: ["wss://relay.test"],
      onMessage: async () => {},
      onError,
    });

    expect(lastPool).not.toBeNull();
    lastPool?.publish.mockReturnValue([Promise.reject(new Error("rate-limited"))]);

    let unhandled: unknown;
    process.once("unhandledRejection", (reason) => {
      unhandled = reason;
    });

    await expect(bus.sendDm(TEST_PUBKEY, "hi")).rejects.toThrow("rate-limited");
    await new Promise((resolve) => setImmediate(resolve));

    expect(unhandled).toBeUndefined();
    expect(onError).toHaveBeenCalled();

    bus.close();
  });

  it("does not throw on typing publish failures", async () => {
    const { startNostrBus } = await import("./nostr-bus.js");
    const onError = vi.fn();
    const bus = await startNostrBus({
      privateKey: TEST_HEX_KEY,
      relays: ["wss://relay.test"],
      onMessage: async () => {},
      onError,
    });

    expect(lastPool).not.toBeNull();
    lastPool?.publish.mockReturnValue([Promise.reject(new Error("rate-limited"))]);

    let unhandled: unknown;
    process.once("unhandledRejection", (reason) => {
      unhandled = reason;
    });

    await expect(bus.sendTypingStart(TEST_PUBKEY)).resolves.toBeUndefined();
    await new Promise((resolve) => setImmediate(resolve));

    expect(unhandled).toBeUndefined();
    expect(onError).toHaveBeenCalled();

    bus.close();
  });
});

describe("typing indicator throttling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throttles typing start events to max 1 per 5 seconds per recipient", async () => {
    const { startNostrBus } = await import("./nostr-bus.js");
    const bus = await startNostrBus({
      privateKey: TEST_HEX_KEY,
      relays: ["wss://relay.test"],
      onMessage: async () => {},
    });

    expect(lastPool).not.toBeNull();
    lastPool?.publish.mockReturnValue([Promise.resolve()]);

    // First call should publish
    await bus.sendTypingStart(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(1);

    // Second call within 5 seconds should be throttled
    await bus.sendTypingStart(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(1);

    // Third call within 5 seconds should also be throttled
    await bus.sendTypingStart(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(1);

    // After 5 seconds, should publish again
    vi.advanceTimersByTime(5000);
    await bus.sendTypingStart(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(2);

    bus.close();
  });

  it("throttles per-recipient independently", async () => {
    const { startNostrBus } = await import("./nostr-bus.js");
    const bus = await startNostrBus({
      privateKey: TEST_HEX_KEY,
      relays: ["wss://relay.test"],
      onMessage: async () => {},
    });

    expect(lastPool).not.toBeNull();
    lastPool?.publish.mockReturnValue([Promise.resolve()]);

    // First call to recipient 1
    await bus.sendTypingStart(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(1);

    // First call to recipient 2 should also publish (different recipient)
    await bus.sendTypingStart(TEST_PUBKEY_2);
    expect(lastPool?.publish).toHaveBeenCalledTimes(2);

    // Second call to recipient 1 should be throttled
    await bus.sendTypingStart(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(2);

    // Second call to recipient 2 should also be throttled
    await bus.sendTypingStart(TEST_PUBKEY_2);
    expect(lastPool?.publish).toHaveBeenCalledTimes(2);

    bus.close();
  });

  it("typing stop bypasses throttle for better UX", async () => {
    const { startNostrBus } = await import("./nostr-bus.js");
    const bus = await startNostrBus({
      privateKey: TEST_HEX_KEY,
      relays: ["wss://relay.test"],
      onMessage: async () => {},
    });

    expect(lastPool).not.toBeNull();
    lastPool?.publish.mockReturnValue([Promise.resolve()]);

    // Send typing start
    await bus.sendTypingStart(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(1);

    // Typing stop should bypass throttle
    await bus.sendTypingStop(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(2);

    // Another stop should also work
    await bus.sendTypingStop(TEST_PUBKEY);
    expect(lastPool?.publish).toHaveBeenCalledTimes(3);

    bus.close();
  });
});

describe("circuit breaker", () => {
  it("opens after threshold failures and blocks requests", async () => {
    const { startNostrBus } = await import("./nostr-bus.js");
    const onError = vi.fn();
    const bus = await startNostrBus({
      privateKey: TEST_HEX_KEY,
      relays: ["wss://relay.test"],
      onMessage: async () => {},
      onError,
    });

    expect(lastPool).not.toBeNull();

    // Fail 5 times (threshold)
    for (let i = 0; i < 5; i++) {
      lastPool?.publish.mockReturnValue([Promise.reject(new Error("fail"))]);
      try {
        await bus.sendDm(TEST_PUBKEY, "hi");
      } catch {
        // expected
      }
    }

    // After 5 failures, circuit breaker should be open
    // Next call should fail immediately without attempting publish
    const callsBefore = lastPool?.publish.mock.calls.length ?? 0;
    lastPool?.publish.mockReturnValue([Promise.reject(new Error("fail"))]);

    try {
      await bus.sendDm(TEST_PUBKEY, "hi");
    } catch {
      // expected
    }

    // Should not have called publish (circuit is open)
    const callsAfter = lastPool?.publish.mock.calls.length ?? 0;
    expect(callsAfter).toBe(callsBefore);

    bus.close();
  });
});

describe("health tracker", () => {
  it("prefers healthy relays over failing ones", async () => {
    const { startNostrBus } = await import("./nostr-bus.js");
    const bus = await startNostrBus({
      privateKey: TEST_HEX_KEY,
      relays: ["wss://bad.relay", "wss://good.relay"],
      onMessage: async () => {},
    });

    expect(lastPool).not.toBeNull();

    // First call - bad relay fails, good relay succeeds
    let callCount = 0;
    lastPool?.publish.mockImplementation((relays: string[]) => {
      callCount++;
      if (relays[0] === "wss://bad.relay") {
        return [Promise.reject(new Error("bad relay"))];
      }
      return [Promise.resolve()];
    });

    await bus.sendDm(TEST_PUBKEY, "hi");

    // After the failure/success pattern, health tracker should prefer good.relay
    // Reset mock to track which relay is tried first
    lastPool?.publish.mockClear();
    let firstRelayTried: string | null = null;
    lastPool?.publish.mockImplementation((relays: string[]) => {
      if (!firstRelayTried) {
        firstRelayTried = relays[0];
      }
      return [Promise.resolve()];
    });

    await bus.sendDm(TEST_PUBKEY, "another message");

    // Good relay should be tried first due to higher health score
    expect(firstRelayTried).toBe("wss://good.relay");

    bus.close();
  });
});
