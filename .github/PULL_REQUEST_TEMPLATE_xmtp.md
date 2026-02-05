## Add XMTP as a documented channel for the OpenClaw community

Hey everyone — this PR adds **XMTP** to the docs and as a bundled extension so OpenClaw users can connect the gateway to the XMTP ecosystem (Converse, Coinbase Wallet, and other XMTP-enabled apps).

### What's XMTP?

XMTP is an open, decentralized messaging protocol. Supporting it means people can run their OpenClaw gateway over XMTP: DMs, groups (MLS), and optional media, all from a single channel config.

### What this PR does

- **New channel doc** ([docs/channels/xmtp.md](docs/channels/xmtp.md)) — Install (bundled or npm), configure `channels.xmtp`, and get going.
- **Channels index** — XMTP listed in the supported channels.
- **Bundled extension** ([extensions/xmtp/](extensions/xmtp/)) — In-repo XMTP channel plugin; optional npm package remains [xmtp-openclaw-channel](https://www.npmjs.com/package/xmtp-openclaw-channel) for installs outside the tree.

### Why it's useful

- **Discovery** — One place to see that XMTP is supported and how to set it up.
- **Consistency** — Same install/config/troubleshooting pattern as other optional channels.
- **Decentralized option** — Another way to use OpenClaw without depending on a single messaging provider.

---

**Checklist**

- [x] Documentation added/updated (docs/channels/xmtp.md, channels index).
- [x] Bundled extension added under extensions/xmtp (no core `src/` changes).
- [x] Doc and extension follow existing channel style.
