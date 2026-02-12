# claw-matrix

OpenClaw channel plugin for Matrix with E2E encryption via `@matrix-org/matrix-sdk-crypto-nodejs`.

Tested and known to work well with [Tuwunel](https://github.com/matrix-construct/tuwunel) homeservers.

## Installation Prompt

Use this prompt with OpenClaw to install claw-matrix. The agent will walk you through setup interactively.

````
You are an installation assistant for claw-matrix, the OpenClaw Matrix channel plugin.

Present the user with 3 deployment options and ask which they'd like to set up:

### Option 1: claw-matrix only
Connect to an existing Matrix homeserver. Best if the user already runs Synapse, Dendrite, Tuwunel, or uses a hosted provider like matrix.org.

Requirements:
- An existing Matrix homeserver with a registered bot account
- The bot account's access token
- Homeserver URL (must be HTTPS)

Steps:
1. Install the claw-matrix plugin:
   `openclaw plugins install https://gitlab.com/nicebit/claw-matrix.git`
2. Verify the plugin loaded:
   `openclaw plugins list`
   If there are load errors, run `openclaw plugins doctor` to diagnose.
3. Add the Matrix channel with an account. Ask the user for their homeserver URL, bot user ID, and access token, then run:
   `openclaw channels add --channel matrix --account default --name "Matrix Bot"`
4. Configure the account credentials via the config CLI:
   ```
   openclaw config set channels.matrix.accounts.default.enabled true
   openclaw config set channels.matrix.accounts.default.homeserver "https://your-homeserver.example.com"
   openclaw config set channels.matrix.accounts.default.userId "@bot:your-homeserver.example.com"
   openclaw config set channels.matrix.accounts.default.accessToken "syt_..."
   openclaw config set channels.matrix.accounts.default.encryption true
   openclaw config set channels.matrix.accounts.default.deviceName "OpenClaw"
   openclaw config set channels.matrix.accounts.default.dm.policy "allowlist"
   openclaw config set channels.matrix.accounts.default.dm.allowFrom '["@youruser:example.com"]'
   openclaw config set channels.matrix.accounts.default.groupPolicy "disabled"
   ```
5. Restart the gateway: `openclaw gateway restart`
6. Verify: `openclaw channels status` and `openclaw channels logs` — look for "Matrix monitor started" and successful /sync

### Option 2: Tuwunel + claw-matrix
Self-host a lightweight, high-performance Matrix homeserver using Tuwunel (Rust-based, successor to conduwuit) alongside claw-matrix. Best for users who want full control over their Matrix infrastructure without the resource overhead of Synapse.

Requirements:
- A server with a domain name and valid TLS (or a reverse proxy)
- Podman or Docker for running Tuwunel
- DNS records pointing to the server

Steps:
1. Pull the Tuwunel container image:
   `podman pull ghcr.io/matrix-construct/tuwunel:main`
2. Create data directory:
   `mkdir -p ~/.local/share/tuwunel`
3. Generate a Tuwunel config at `~/.local/share/tuwunel/tuwunel.toml`:
   ```toml
   [global]
   server_name = "your-domain.com"
   database_path = "/data/db"
   port = [8448]
   address = "0.0.0.0"
   allow_registration = false
   allow_encryption = true
   allow_federation = true
   trusted_servers = ["matrix.org"]
   log = "info"
   ```
4. Run Tuwunel:
   ```
   podman run -d --name tuwunel \
     --network=host --userns=keep-id \
     -v ~/.local/share/tuwunel:/data:Z \
     ghcr.io/matrix-construct/tuwunel:main
   ```
5. Register the bot account via the Tuwunel admin API or CLI.
6. Obtain an access token for the bot account.
7. Follow Option 1 steps 1-6 using `https://your-domain.com:8448` as the homeserver URL and the bot's access token.

### Option 3: Tuwunel + Cloudflare + claw-matrix
Full production stack: Tuwunel homeserver proxied through Cloudflare for DDoS protection, TLS termination, and caching — plus claw-matrix for OpenClaw integration. Best for public-facing deployments or federation-heavy setups.

Requirements:
- A Cloudflare account with a domain configured
- `cloudflared` (Cloudflare Tunnel daemon) installed
- Podman or Docker for running Tuwunel

Steps:
1. Set up Tuwunel (follow Option 2, steps 1-4), but bind to localhost only:
   - In `tuwunel.toml`, set `address = "127.0.0.1"`
2. Configure Cloudflare DNS:
   - Add an A/AAAA record for `matrix.your-domain.com` (proxied, orange cloud)
   - Add an SRV record: `_matrix._tcp.your-domain.com → matrix.your-domain.com:443`
3. Create a Cloudflare Tunnel:
   ```
   cloudflared tunnel create tuwunel
   cloudflared tunnel route dns tuwunel matrix.your-domain.com
   ```
4. Configure the tunnel (`~/.cloudflared/config.yml`):
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: ~/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: matrix.your-domain.com
       service: http://localhost:8448
     - service: http_status:404
   ```
5. Start the tunnel:
   `cloudflared tunnel run tuwunel`
   (Or set up as a systemd service for persistence.)
6. Configure Cloudflare SSL/TLS to "Full (strict)".
7. Set up `.well-known` delegation if `server_name` differs from the matrix subdomain:
   - Serve `/.well-known/matrix/server` returning `{"m.server": "matrix.your-domain.com:443"}`
   - Serve `/.well-known/matrix/client` returning `{"m.homeserver": {"base_url": "https://matrix.your-domain.com"}}`
8. Register the bot account and obtain an access token (see Option 2, steps 5-6).
9. Follow Option 1 steps 1-6 using `https://matrix.your-domain.com` as the homeserver URL.


---

After presenting the options, guide the user step-by-step through their chosen option. Ask for each required value interactively (domain, tokens, user IDs). Validate inputs where possible (e.g., homeserver URL must start with https://, userId must match @user:domain format). After installation, help verify the setup is working by checking gateway logs.
````

## Features

| Capability | Status |
|------------|--------|
| E2E encryption (Megolm/Olm) | Working |
| Text messages (DM + group) | Working |
| Media (image/audio/video/file) | Working |
| Reactions (send/list/remove) | Working |
| Edit + delete messages | Working |
| Reply threading | Working |
| Typing indicators | Working |
| Auto-join invited rooms | Working |
| Event deduplication | Working |
| Soft logout recovery | Working |
| Health metrics | Working |
| Cross-signing verification | Working |
| Recovery key + backup import | Working |
| Room management (invite/join/leave/kick/ban) | Working |

## Architecture

```
index.ts                    → register(api): stores PluginRuntime, registers channel
src/channel.ts              → ChannelPlugin contract (all OpenClaw adapters)
src/monitor.ts              → sync loop lifecycle, inbound dispatch (per-room serial queue)
src/config.ts               → Zod schema + ResolvedMatrixAccount resolver
src/runtime.ts              → module-level PluginRuntime store (get/set)
src/actions.ts              → agent tool actions (send/read/react/edit/delete/channel-list/invite/join/leave/kick/ban)
src/types.ts                → Matrix event/response interfaces + typed content guards
src/health.ts               → sync, crypto, room health metrics + 12 operational counters
src/client/
  http.ts                   → matrixFetch() — auth, rate limiting, 429 retry
  sync.ts                   → runSyncLoop() — long-poll, decrypt, dedup, auto-join
  send.ts                   → send/edit/delete/react, typing indicators, media send
  media.ts                  → upload/download, AES-256-CTR encrypt/decrypt
  rooms.ts                  → room state (encryption, type, names, members, display names)
  targets.ts                → target resolution (@user → DM, #alias → roomId)
src/crypto/
  machine.ts                → OlmMachine init/close, crypto store path, FFI timeout wrapper
  outgoing.ts               → processOutgoingRequests() — key upload/query/claim/share
  recovery.ts               → recovery key decode, backup activation, per-session backup fetch
  ssss.ts                   → SSSS decrypt, cross-signing restore from server secret storage
  self-sign.ts              → canonical JSON, ed25519 device self-signing, signature upload
src/util/
  rate-limit.ts             → token bucket rate limiter
  logger.ts                 → structured logging wrapper (key=value fields)
src/openclaw-types.ts       → TypeScript interfaces for OpenClaw plugin SDK contract
tests/                      → unit tests + integration tests (vitest)
  integration/
    recovery-roundtrip.test.ts  → recovery key decode/encode round-trip + backup key creation
    outbound-encrypt.test.ts    → ensureRoomKeysShared → encryptRoomEvent → putEvent flow
    media-roundtrip.test.ts     → AES-256-CTR encrypt/decrypt round-trip + SHA-256 tamper detection
```

## Message Flow

### Inbound (Matrix → Agent)
1. `runSyncLoop()` long-polls `/sync` (30s timeout, exponential backoff)
2. To-device events fed to OlmMachine FIRST (key deliveries)
3. Sync token saved (after crypto state, before timeline — crash-safe)
4. UTD queue retried (previously undecryptable events)
5. Timeline events: dedup check → encrypted → `decryptRoomEvent()` → plaintext
6. Media messages: download + decrypt → save to workspace
7. `onMessage(event, roomId)` fires in `monitor.ts`
8. Monitor: skip own → access control (allowlist, prefix-normalized) → empty body
9. Display name resolved (cache → profile API → raw userId)
10. Thread ID extracted if present → session key adjusted
11. `enqueueForRoom()` → serialized per-room dispatch via OpenClaw pipeline
12. Agent reply delivered via `deliver` callback → `sendMatrixMessage()`

### Outbound (Agent → Matrix)
1. OpenClaw calls `outbound.sendText()`, `outbound.sendMedia()`, or deliver callback
2. Text: markdown→HTML via markdown-it + sanitize-html, reply fallback with HTML-escaped sender + quoted text (spec §11.19.1)
3. Media: AES-256-CTR encrypt (if room encrypted) → upload → construct event
4. Size check: pre-encryption (65KB) + post-encryption (65KB, catches base64 expansion)
5. Encrypted rooms: `ensureRoomKeysShared()` → `encryptRoomEvent()` → PUT
6. Plaintext rooms: PUT `m.room.message` directly

## Configuration

```typescript
// channels.matrix in openclaw.json
{
  homeserver: string,           // HTTPS URL (normalized to origin)
  userId: string,               // @user:domain format
  accessToken: string,
  password?: string,            // for soft logout re-auth
  encryption: boolean,          // default: true
  deviceName: string,           // default: "OpenClaw"
  dm: {
    policy: "pairing"|"allowlist"|"open"|"disabled",  // default: "allowlist"
    allowFrom: string[],
  },
  groupPolicy: "allowlist"|"open"|"disabled",         // default: "allowlist"
  groups: Record<roomId, { allow, requireMention }>,
  groupAllowFrom: string[],
  autoJoin: "always"|"allowlist"|"off",               // default: "off"
  autoJoinAllowFrom: string[],
  replyToMode: "off"|"first"|"all",                   // default: "first"
  chunkMode: "length"|"paragraph",                    // default: "length"
  textChunkLimit: number,                             // default: 4096
  maxMediaSize: number,                               // default: 50MB
  rateLimitTokens: number,                            // default: 10
  rateLimitRefillPerSec: number,                      // default: 2
  recoveryKey?: string,
  trustMode: "tofu"|"strict",                         // default: "tofu"
}
```

## Crypto

- **Library:** `@matrix-org/matrix-sdk-crypto-nodejs` ^0.4.0 (Rust FFI via NAPI)
- **Store:** SQLite at `~/.openclaw/claw-matrix/accounts/default/{server}__{user}/{tokenHash}/crypto` — path is hardcoded per plugin ID in `machine.ts`. Upgrading from `matrix-rust` creates a new store (old keys at `~/.openclaw/matrix-rust/accounts/` are NOT migrated). Configure a `recoveryKey` to recover old room keys from server-side backup.
- **Trust:** TOFU mode (configurable to strict)
- **Cross-signing:** On startup, SSSS secrets are decrypted using the recovery key (HKDF-SHA-256 + AES-256-CTR + HMAC-SHA-256), then the device is self-signed with the self-signing key (ed25519) and the signature uploaded to the homeserver. Already-signed devices are detected and skipped. This bypasses the SDK's `crossSigningStatus()` limitation (which checks an internal MessagePack blob, not the secrets table).
- **OTK type safety:** `otkCounts` wrapped as `Map<string, number>` for FFI compatibility with `receiveSyncChanges()`
- **Key sharing:** `ensureRoomKeysShared()` — track users → query keys → claim OTKs → share Megolm session
- **Encryption config caching:** `m.room.encryption` state events store algorithm, `rotation_period_ms`, `rotation_period_msgs` (not just a boolean flag)
- **UTD queue:** max 200 entries, 5min retry window, 1hr expiry, FIFO eviction, backup fallback after 2+ retries
- **Recovery key:** base58 decode → 0x8B01 prefix validation → parity check → BackupDecryptionKey → server backup activation
- **Backup UTD fallback:** per-session fetch from server backup, decryptV1, inject via synthetic forwarded_room_key
- **Media encryption:** AES-256-CTR with SHA-256 hash-before-decrypt (malleability protection)
- **MXC URI validation:** Strict regex — server_name `[a-zA-Z0-9._:-]`, media_id `[a-zA-Z0-9._-]` (prevents path traversal)
- **SSSS key verification:** Recovery key verified against key metadata (HKDF info="") before decrypting secrets (HKDF info=secretName)
- **Startup diagnostics:** Logs device keys + cross-signing status

## Reliability

- **Event dedup:** FIFO set (1000 entries), persisted with sync token across restarts
- **Rate limiting:** HTTP (10 tokens, 2/s refill) + crypto outgoing (5 tokens, 1/s)
- **429 handling:** Parses Retry-After header, automatic single retry
- **Auto-join rate limit:** Max 3 joins per 60 seconds
- **Sync token:** Saved after crypto state ingestion, before timeline processing
- **Per-room serial dispatch:** Prevents interleaved agent replies from batched messages
- **Per-event error boundary:** One bad event in sync doesn't break the entire cycle
- **Pre-send + post-encryption size check:** 65KB limit enforced in `putEvent()` for all event types, plus post-encryption check catches base64 expansion
- **Soft logout:** Re-authenticates with stored password, preserves crypto store
- **Config validation:** Zod schema with fallback logging (field-level error messages)
- **Timeout protection:** Typed MatrixTimeoutError/MatrixNetworkError in HTTP layer; 30s crypto FFI timeouts prevent hangs
- **Graceful shutdown:** Sync loop drains per-room dispatch queues before crypto teardown; closeMachine() is idempotent (promise guard)
- **Double-start guard:** Prevents hot-reload from launching duplicate sync loops
- **DM detection:** Uses m.direct account data (authoritative) with member-count fallback
- **Health metrics:** Sync failures, UTD queue depth, room counts, plus 12 operational counters (messages, crypto ops, media, rate limits)
- **Structured logging:** Key=value fields on all monitor log lines for production observability

## ChannelPlugin Adapters

- **meta** — id, label, blurb
- **capabilities** — text, media, reactions, edit, unsend, reply, typing, dm+group, blockStreaming (threads: false — no protocol support)
- **config** — listAccountIds, resolveAccount, isEnabled, isConfigured, resolveAllowFrom
- **gateway** — startAccount (launches monitor), stopAccount (abortSignal)
- **outbound** — deliveryMode: "direct", sendText, sendPayload, sendMedia, resolveTarget
- **security** — resolveDmPolicy (returns dm.policy + dm.allowFrom)
- **groups** — resolveRequireMention
- **actions** — send, read (with alias/user target resolution), react, reactions, unreact, edit, delete, unsend, channel-list, invite, join, leave, kick, ban
- **status** — buildAccountSnapshot (includes health metrics)
- **messaging** — normalizeTarget + targetResolver.looksLikeId

## Dependencies

```json
{ "@matrix-org/matrix-sdk-crypto-nodejs": "^0.4.0", "bs58": "^6.0.0",
  "markdown-it": "14.1.0", "sanitize-html": "^2.13.0", "zod": "^4.3.6" }
```

**Note:** Only one Matrix account is supported per gateway instance (single-account limitation).
OlmMachine, the sync loop, and room state caches are global singletons.

## License

MIT
