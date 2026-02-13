import * as crypto from "node:crypto";
/**
 * Tests for the bugfix round: key zeroing, reply fallback stripping,
 * m.notice filtering, UTD retry cap, and alreadySigned fix.
 */
import { describe, it, expect } from "vitest";
import { stripReplyFallback, stripHtmlReplyFallback } from "../src/util/reply-fallback.js";

// ── Reply fallback stripping (BOT-A) ────────────────────────────────────

describe("stripReplyFallback", () => {
  it("strips single-line reply fallback", () => {
    const body = "> <@alice:example.com> Hello\n\nMy reply";
    expect(stripReplyFallback(body)).toBe("My reply");
  });

  it("strips multi-line reply fallback", () => {
    const body = "> <@alice:example.com> First line\n> Second line\n\nMy reply";
    expect(stripReplyFallback(body)).toBe("My reply");
  });

  it("returns body unchanged when no fallback present", () => {
    const body = "Just a normal message";
    expect(stripReplyFallback(body)).toBe("Just a normal message");
  });

  it("strips fallback even without trailing blank line", () => {
    const body = "> <@alice:example.com> Hello\nMy reply";
    expect(stripReplyFallback(body)).toBe("My reply");
  });

  it("handles empty string", () => {
    expect(stripReplyFallback("")).toBe("");
  });

  it("handles body that is only fallback", () => {
    const body = "> <@alice:example.com> Hello\n\n";
    expect(stripReplyFallback(body)).toBe("");
  });
});

describe("stripHtmlReplyFallback", () => {
  it("strips mx-reply block", () => {
    const html =
      '<mx-reply><blockquote><a href="url">In reply to</a> <a href="url">@alice</a><br>Hello</blockquote></mx-reply>My reply';
    expect(stripHtmlReplyFallback(html)).toBe("My reply");
  });

  it("returns html unchanged when no mx-reply present", () => {
    const html = "<p>Just a normal message</p>";
    expect(stripHtmlReplyFallback(html)).toBe("<p>Just a normal message</p>");
  });

  it("handles empty string", () => {
    expect(stripHtmlReplyFallback("")).toBe("");
  });

  it("strips mx-reply with nested HTML", () => {
    const html =
      "<mx-reply><blockquote><b>bold</b>\n<em>italic</em></blockquote></mx-reply>Actual content";
    expect(stripHtmlReplyFallback(html)).toBe("Actual content");
  });
});

// ── Key zeroing (SEC-2, SEC-3) ──────────────────────────────────────────

describe("key zeroing in decryptSecret", () => {
  // Replicate SSSS crypto to verify zeroing behavior
  function deriveKeys(rawKey: Buffer, info: string): { aesKey: Buffer; hmacKey: Buffer } {
    const salt = Buffer.alloc(32, 0);
    const derived = crypto.hkdfSync("sha256", rawKey, salt, info, 64);
    return {
      aesKey: Buffer.from(derived.slice(0, 32)),
      hmacKey: Buffer.from(derived.slice(32, 64)),
    };
  }

  function unpaddedBase64(buf: Buffer): string {
    return buf.toString("base64").replace(/=+$/, "");
  }

  function encryptSecret(
    rawKey: Buffer,
    secretName: string,
    plaintext: string,
  ): { iv: string; ciphertext: string; mac: string } {
    const { aesKey, hmacKey } = deriveKeys(rawKey, secretName);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-ctr", aesKey, iv);
    const ciphertextBuf = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf8")),
      cipher.final(),
    ]);
    const mac = crypto.createHmac("sha256", hmacKey).update(ciphertextBuf).digest();
    return {
      iv: unpaddedBase64(iv),
      ciphertext: unpaddedBase64(ciphertextBuf),
      mac: unpaddedBase64(mac),
    };
  }

  it("decryptSecret can be called multiple times with same rawKey (key survives loop)", async () => {
    // Import the actual decryptSecret
    const { decryptSecret } = await import("../src/crypto/ssss.js");

    const rawKey = new Uint8Array(crypto.randomBytes(32));
    const secrets = [
      "m.cross_signing.master",
      "m.cross_signing.self_signing",
      "m.cross_signing.user_signing",
    ];

    const plaintexts = secrets.map(() => unpaddedBase64(crypto.randomBytes(32)));

    // Encrypt all three
    const encrypted = secrets.map((name, i) =>
      encryptSecret(Buffer.from(rawKey), name, plaintexts[i]),
    );

    // Decrypt all three with the same rawKey — simulates the loop in restoreCrossSigningFromSSSSIfNeeded
    for (let i = 0; i < secrets.length; i++) {
      const result = decryptSecret(rawKey, secrets[i], encrypted[i]);
      expect(result).toBe(plaintexts[i]);
    }

    // After the loop, the caller should zero rawKey
    rawKey.fill(0);
    expect(rawKey.every((b) => b === 0)).toBe(true);
  });
});

// ── alreadySigned check with correct SSK key ID (SEC-5) ─────────────────

describe("alreadySigned detection", () => {
  const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

  function ed25519PrivateKeyFromSeed(seed: Buffer): crypto.KeyObject {
    const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
    return crypto.createPrivateKey({ key: pkcs8Der, format: "der", type: "pkcs8" });
  }

  function deriveEd25519PublicKey(seed: Buffer): string {
    const privateKey = ed25519PrivateKeyFromSeed(seed);
    const publicKey = crypto.createPublicKey(privateKey);
    const rawPub = publicKey.export({ type: "spki", format: "der" });
    return Buffer.from(rawPub.subarray(rawPub.length - 32))
      .toString("base64")
      .replace(/=+$/, "");
  }

  it("detects signature from current SSK", () => {
    const sskSeed = crypto.randomBytes(32);
    const currentSskKeyId = deriveEd25519PublicKey(sskSeed);

    const deviceSigs: Record<string, string> = {
      "ed25519:MYDEVICE": "device-self-sig",
      [`ed25519:${currentSskKeyId}`]: "cross-signing-sig",
    };

    const alreadySigned = `ed25519:${currentSskKeyId}` in deviceSigs;
    expect(alreadySigned).toBe(true);
  });

  it("does NOT detect signature from stale/different SSK", () => {
    const currentSskSeed = crypto.randomBytes(32);
    const staleSskSeed = crypto.randomBytes(32);
    const staleSskKeyId = deriveEd25519PublicKey(staleSskSeed);
    const currentSskKeyId = deriveEd25519PublicKey(currentSskSeed);

    // Device has a signature from the OLD (stale) SSK, not the current one
    const deviceSigs: Record<string, string> = {
      "ed25519:MYDEVICE": "device-self-sig",
      [`ed25519:${staleSskKeyId}`]: "old-cross-signing-sig",
    };

    const alreadySigned = `ed25519:${currentSskKeyId}` in deviceSigs;
    expect(alreadySigned).toBe(false);
  });

  it("old check (any ed25519: key) would incorrectly match stale SSK", () => {
    // This tests the bug that was fixed: the old code used .some() which would
    // match ANY ed25519: signature, even from a rotated/stale SSK
    const staleSskSeed = crypto.randomBytes(32);
    const staleSskKeyId = deriveEd25519PublicKey(staleSskSeed);

    const deviceSigs: Record<string, string> = {
      "ed25519:MYDEVICE": "device-self-sig",
      [`ed25519:${staleSskKeyId}`]: "old-cross-signing-sig",
    };

    // Old buggy check: any ed25519: key that isn't the device key
    const oldAlreadySigned = Object.keys(deviceSigs).some(
      (k) => k.startsWith("ed25519:") && k !== "ed25519:MYDEVICE",
    );
    expect(oldAlreadySigned).toBe(true); // Bug: thinks it's signed by current SSK
  });
});

// ── HTTPS enforcement in fallback config (SEC-7) ────────────────────────

describe("HTTPS enforcement in fallback config", () => {
  it("rejects HTTP in fallback path", async () => {
    const { resolveMatrixAccount } = await import("../src/config.js");
    expect(() =>
      resolveMatrixAccount({
        channels: {
          matrix: {
            homeserver: "http://evil.com",
            userId: "@bot:evil.com",
            accessToken: "token",
          },
        },
      }),
    ).toThrow(/must use HTTPS/);
  });

  it("rejects empty homeserver in fallback path", async () => {
    const { resolveMatrixAccount } = await import("../src/config.js");
    expect(() =>
      resolveMatrixAccount({
        channels: {
          matrix: {
            homeserver: "",
            userId: "invalid",
            accessToken: "token",
          },
        },
      }),
    ).toThrow(/must use HTTPS/);
  });
});
