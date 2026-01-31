import { describe, expect, it, vi, beforeAll } from "vitest";

const TEST_HEX_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const TEST_PUBKEY = "f".repeat(64);

// Mock state store
vi.mock("./nostr-state-store.js", () => {
  return {
    readNostrBusState: vi.fn(async () => null),
    writeNostrBusState: vi.fn(async () => undefined),
    computeSinceTimestamp: vi.fn(() => 0),
    readNostrProfileState: vi.fn(async () => null),
    writeNostrProfileState: vi.fn(async () => undefined),
  };
});

describe("rust-nostr SDK integration", () => {
  it("loads WASM and initializes keys", async () => {
    const { initRustNostr, normalizePubkeyRust, pubkeyToNpubRust } = await import(
      "./nostr-bus-rust.js"
    );

    // Initialize WASM
    await initRustNostr();

    // Test pubkey normalization
    const normalized = normalizePubkeyRust(TEST_PUBKEY);
    expect(normalized).toBe(TEST_PUBKEY.toLowerCase());

    // Test npub conversion
    const npub = pubkeyToNpubRust(TEST_PUBKEY);
    expect(npub).toMatch(/^npub1/);

    // Round-trip
    const backToHex = normalizePubkeyRust(npub);
    expect(backToHex).toBe(TEST_PUBKEY.toLowerCase());
  });

  it("derives public key correctly from private key", async () => {
    const { initRustNostr } = await import("./nostr-bus-rust.js");
    const { Keys, SecretKey } = await import("@rust-nostr/nostr-sdk");

    await initRustNostr();

    // Derive public key directly (without starting the full bus)
    const secretKey = SecretKey.parse(TEST_HEX_KEY);
    const keys = new Keys(secretKey);
    const publicKey = keys.publicKey.toHex();

    // Public key should be derived correctly
    expect(publicKey).toHaveLength(64);
    expect(publicKey).toMatch(/^[0-9a-f]+$/);
  });

  it("bus handle interface is correctly typed", async () => {
    const { initRustNostr } = await import("./nostr-bus-rust.js");
    const { Keys, SecretKey, Client, NostrSigner } = await import("@rust-nostr/nostr-sdk");

    await initRustNostr();

    // Test that we can create the components without the full bus
    const secretKey = SecretKey.parse(TEST_HEX_KEY);
    const keys = new Keys(secretKey);
    const signer = NostrSigner.keys(keys);
    const client = new Client(signer);

    // Verify the client has the methods we need
    expect(typeof client.addRelay).toBe("function");
    expect(typeof client.connect).toBe("function");
    expect(typeof client.disconnect).toBe("function");
    expect(typeof client.subscribe).toBe("function");
    expect(typeof client.sendEventBuilder).toBe("function");

    // Verify signer has NIP-04 methods
    expect(typeof signer.nip04Encrypt).toBe("function");
    expect(typeof signer.nip04Decrypt).toBe("function");
  });
});

describe("rust-nostr vs nostr-tools comparison", () => {
  it("both implementations derive the same public key from private key", async () => {
    const { initRustNostr } = await import("./nostr-bus-rust.js");
    const { Keys, SecretKey } = await import("@rust-nostr/nostr-sdk");
    const { getPublicKey } = await import("nostr-tools");

    await initRustNostr();

    // rust-nostr - uses parse() for both hex and bech32
    const rustSecretKey = SecretKey.parse(TEST_HEX_KEY);
    const rustKeys = new Keys(rustSecretKey);
    const rustPubkey = rustKeys.publicKey.toHex();

    // nostr-tools - convert hex to Uint8Array
    const skBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      skBytes[i] = parseInt(TEST_HEX_KEY.slice(i * 2, i * 2 + 2), 16);
    }
    const toolsPubkey = getPublicKey(skBytes);

    // Should match
    expect(rustPubkey).toBe(toolsPubkey);
  });
});
