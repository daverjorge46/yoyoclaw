#!/usr/bin/env node
/**
 * Test: chat.send → skill-store install flow
 *
 * Connects to the Gateway WebSocket, sends a chat message asking to install
 * a skill, and captures the agent's response (including tool calls).
 *
 * Event format:
 *   - agent events: { event: "agent", payload: { stream: "tool"|"assistant"|"lifecycle", data: {...} } }
 *     - stream "tool": data.phase = "start"|"result", data.name = tool name
 *     - stream "assistant": data.text = text chunk
 *     - stream "lifecycle": data.phase = "start"|"end"|"error"
 *   - chat events: { event: "chat", payload: { state: "delta"|"final"|"aborted", message: {...} } }
 *
 * Usage:
 *   node test-chat-skill-install.cjs [auth] [port] [message] [timeout_s]
 */

const { WebSocket } = require("ws");
const { randomUUID } = require("crypto");

// ── Args ──────────────────────────────────────────────
const authArg = process.argv[2] || "token:dev-test-token-please-change-in-production";
const [authType, authValue] = authArg.includes(":")
  ? [authArg.split(":")[0], authArg.slice(authArg.indexOf(":") + 1)]
  : ["password", authArg];
const port = process.argv[3] || "18789";
const userMessage = process.argv[4] || "帮我使用skill-store安装 flow 这个skill";
const timeoutSec = parseInt(process.argv[5] || "120", 10);

console.log(`\n╔══════════════════════════════════════════════════════════╗`);
console.log(`║  chat.send Skill Install Test                           ║`);
console.log(`╠══════════════════════════════════════════════════════════╣`);
console.log(`║  Gateway:  ws://127.0.0.1:${port}`);
console.log(`║  Message:  ${userMessage.substring(0, 50)}`);
console.log(`║  Timeout:  ${timeoutSec}s`);
console.log(`╚══════════════════════════════════════════════════════════╝\n`);

const ws = new WebSocket(`ws://127.0.0.1:${port}`, {
  origin: `http://localhost:${port}`,
});

let phase = "connecting";
let chatId = null;
const events = [];
let fullText = "";
let toolCalls = [];
let toolResults = [];
let finished = false;
let assistantDebugCount = 0;

ws.on("open", () => {
  console.log("[ws] Connected");
});

ws.on("message", (raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  // ── Step 1: connect.challenge → authenticate ──
  if (msg.type === "event" && msg.event === "connect.challenge") {
    console.log("[ws] Received connect.challenge, authenticating...");
    ws.send(
      JSON.stringify({
        type: "req",
        method: "connect",
        id: randomUUID(),
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: { id: "webchat", version: "dev", platform: "linux", mode: "webchat" },
          caps: ["tool-events"],
          role: "operator",
          scopes: ["operator.admin"],
          auth: authType === "token" ? { token: authValue } : { password: authValue },
        },
      }),
    );
    phase = "authenticating";
    return;
  }

  // ── Step 2: connect response → send chat.send ──
  if (msg.type === "res" && phase === "authenticating") {
    if (!msg.ok) {
      console.error("[ERROR] Auth failed:", JSON.stringify(msg).substring(0, 300));
      process.exit(1);
    }
    console.log("[ws] Authenticated successfully");
    phase = "authenticated";

    chatId = randomUUID();
    console.log(`[chat] Sending: "${userMessage}"\n`);
    ws.send(
      JSON.stringify({
        type: "req",
        method: "chat.send",
        id: chatId,
        params: {
          sessionKey: "skill-install-test-" + Date.now(),
          message: userMessage,
          idempotencyKey: randomUUID(),
          thinking: "low",
          deliver: true,
          timeoutMs: (timeoutSec - 10) * 1000,
        },
      }),
    );
    phase = "chat_sent";
    return;
  }

  // ── Step 3: Handle agent events (tool calls, text, lifecycle) ──
  if (msg.type === "event" && msg.event === "agent") {
    events.push(msg);
    const { stream, data } = msg.payload || {};

    if (stream === "tool" && data) {
      if (data.phase === "start") {
        const name = data.name || "?";
        console.log(`[tool:start] ${name}`);
        toolCalls.push({ name, phase: "start", input: data.input });
      } else if (data.phase === "result") {
        const name = data.name || "?";
        const output =
          typeof data.output === "string" ? data.output : JSON.stringify(data.output || "");
        // Show tool result highlights
        if (
          output.includes("store-cli") ||
          output.includes("install") ||
          output.includes("verified") ||
          output.includes("Installed") ||
          output.includes("SKILL")
        ) {
          console.log(`[tool:result] ${name}: ${output.substring(0, 300)}`);
        } else {
          console.log(`[tool:result] ${name}: (${output.length} chars)`);
        }
        toolResults.push({ name, output });
      }
    }

    if (stream === "assistant" && data) {
      const text = typeof data.text === "string" ? data.text : typeof data === "string" ? data : "";
      if (text) {
        fullText += text;
        process.stdout.write(".");
      }
      // Debug: log first few assistant data payloads
      if (assistantDebugCount < 3) {
        console.log(`\n[debug:assistant] data=${JSON.stringify(data).substring(0, 300)}`);
        assistantDebugCount++;
      }
    }

    if (stream === "lifecycle" && data?.phase === "end") {
      console.log("\n[lifecycle] Agent run ended");
    }
    if (stream === "lifecycle" && data?.phase === "error") {
      console.log(`\n[lifecycle] Agent run error: ${JSON.stringify(data).substring(0, 200)}`);
    }
    return;
  }

  // ── Step 4: Handle chat state events ──
  if (msg.type === "event" && msg.event === "chat") {
    events.push(msg);
    const { state, message } = msg.payload || {};

    if (state === "delta") {
      const text = message?.text || message?.content || "";
      if (text && typeof text === "string") fullText = text; // delta is accumulated
      if (assistantDebugCount < 5 && text) {
        console.log(`\n[debug:chat.delta] text(${typeof text})=${String(text).substring(0, 200)}`);
        assistantDebugCount++;
      }
    }

    if (state === "final") {
      const responseText = message?.text || message?.content || "";
      if (responseText) fullText = responseText;
      console.log(`\n[chat] Final response received (${fullText.length} chars)`);
      finish(true);
      return;
    }

    if (state === "aborted") {
      console.log("\n[chat] Run was aborted");
      finish(false);
      return;
    }
    return;
  }

  // ── Step 5: chat.send RPC response ──
  if (msg.type === "res" && msg.id === chatId) {
    if (!msg.ok) {
      console.error("[ERROR] chat.send failed:", JSON.stringify(msg).substring(0, 500));
      process.exit(1);
    }
    phase = "streaming";
    return;
  }
});

function finish(success) {
  if (finished) return;
  finished = true;

  console.log(`\n${"═".repeat(60)}`);
  console.log("TEST RESULTS");
  console.log("═".repeat(60));
  console.log(`Total events: ${events.length}`);
  console.log(`Tool calls: ${toolCalls.length}`);
  console.log(`Tool results: ${toolResults.length}`);

  if (toolCalls.length > 0) {
    console.log("\nTool call summary:");
    for (const tc of toolCalls) {
      const inputStr = typeof tc.input === "string" ? tc.input : JSON.stringify(tc.input || "");
      console.log(`  → ${tc.name}: ${inputStr.substring(0, 150)}`);
    }
  }

  // Detect if store-cli.py was invoked
  const storeCliInvoked = toolResults.some(
    (tr) =>
      tr.output.includes("store-cli") ||
      tr.output.includes("Installed") ||
      tr.output.includes("verified"),
  );
  const installSuccess = toolResults.some(
    (tr) => tr.output.includes("Installed") && tr.output.includes("verified"),
  );

  console.log(`\nStore CLI invoked: ${storeCliInvoked ? "YES ✓" : "NO ✗"}`);
  console.log(`Install success:   ${installSuccess ? "YES ✓" : "NO ✗"}`);

  if (fullText) {
    const tail =
      fullText.length > 600 ? "..." + fullText.substring(fullText.length - 600) : fullText;
    console.log(`\nAgent response:\n${tail}`);
  }

  console.log("═".repeat(60));
  ws.close();
  process.exit(success && storeCliInvoked ? 0 : 1);
}

ws.on("error", (err) => {
  console.error("[ERROR] WebSocket error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log(`\n[TIMEOUT] ${timeoutSec}s elapsed`);
  finish(false);
}, timeoutSec * 1000);
