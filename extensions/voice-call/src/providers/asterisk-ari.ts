import crypto from "node:crypto";
import type { VoiceCallConfig } from "../config.js";
import type { CallManager } from "../manager.js";
import type {
  EndReason,
  HangupCallInput,
  InitiateCallInput,
  InitiateCallResult,
  PlayTtsInput,
  ProviderWebhookParseResult,
  StartListeningInput,
  StopListeningInput,
  WebhookContext,
  WebhookVerificationResult,
  NormalizedEvent,
} from "../types.js";
import type { VoiceCallProvider } from "./base.js";
import { AriClient, type AriEvent } from "./asterisk-ari/ari-client.js";
import { AriMedia, type MediaGraph } from "./asterisk-ari/ari-media.js";
import { OpenAIRealtimeSTTProvider } from "./stt-openai-realtime.js";
import { chunkAudio } from "../telephony-audio.js";
import type { TelephonyTtsProvider } from "../telephony-tts.js";

type AriConfig = NonNullable<VoiceCallConfig["asteriskAri"]>;

function nowMs(): number {
  return Date.now();
}

export function buildEndpoint(to: string, trunk?: string): string {
  if (to.includes("/")) {
    return to;
  }
  const t = trunk?.trim();
  return t ? `PJSIP/${t}/${to}` : `PJSIP/${to}`;
}

function makeEvent(partial: Omit<NormalizedEvent, "id" | "timestamp">): NormalizedEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: nowMs(),
    ...partial,
  } as NormalizedEvent;
}

type CallState = {
  callId: string;
  providerCallId: string;
  sipChannelId: string;
  media?: MediaGraph;
  speaking: boolean;
  stt?: ReturnType<OpenAIRealtimeSTTProvider["createSession"]>;
  pendingMulaw?: Buffer;
  rtpPeer?: { address: string; port: number };
  rtpSeen?: boolean;
  rtpState?: { seq: number; ts: number; ssrc: number };
};

export class AsteriskAriProvider implements VoiceCallProvider {
  readonly name = "asterisk-ari" as const;

  private readonly cfg: AriConfig;
  private readonly manager: CallManager;
  private readonly client: AriClient;
  private readonly mediaFactory: AriMedia;
  private ttsProvider: TelephonyTtsProvider | null = null;

  // providerCallId -> state
  private readonly calls = new Map<string, CallState>();

  constructor(params: { config: VoiceCallConfig; manager: CallManager }) {
    const a = params.config.asteriskAri;
    if (!a) throw new Error("asteriskAri config missing");
    this.cfg = a;
    this.manager = params.manager;
    this.client = new AriClient(this.cfg);
    this.mediaFactory = new AriMedia(this.cfg, this.client);

    this.client.connectWs((evt) => this.onAriEvent(evt));
  }

  setTTSProvider(provider: TelephonyTtsProvider) {
    this.ttsProvider = provider;
  }

  verifyWebhook(_ctx: WebhookContext): WebhookVerificationResult {
    return { ok: true };
  }

  parseWebhookEvent(_ctx: WebhookContext): ProviderWebhookParseResult {
    return { events: [], statusCode: 200 };
  }

  async initiateCall(input: InitiateCallInput): Promise<InitiateCallResult> {
    const providerCallId = crypto.randomUUID();
    const endpoint = buildEndpoint(input.to, this.cfg.trunk);

    // 1. Check endpoint online (only for direct PJSIP/<resource>, not trunks)
    if (endpoint.toUpperCase().startsWith("PJSIP/")) {
      const parts = endpoint.split("/");
      if (parts.length === 2) {
        const resource = parts[1];
        try {
          const state = await this.client.getEndpointState(resource);
          if (state.state.toLowerCase() !== "online") {
            throw new Error(`Endpoint PJSIP/${resource} is ${state.state}`);
          }
        } catch (err: any) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Endpoint PJSIP/${resource} unavailable (${msg})`);
        }
      }
    }

    // 2. Originate call
    const ch = await this.client.createChannel({
      endpoint,
      app: this.cfg.app,
      appArgs: providerCallId,
      callerId: input.fromName ? `${input.fromName} <${input.from}>` : undefined,
    });

    const state: CallState = {
      callId: input.callId,
      providerCallId,
      sipChannelId: ch.id,
      speaking: false,
    };
    this.calls.set(providerCallId, state);

    this.manager.processEvent(
      makeEvent({
        type: "call.initiated",
        callId: input.callId,
        providerCallId,
        direction: "outbound",
        from: input.from,
        to: input.to,
      }),
    );

    this.manager.processEvent(
      makeEvent({
        type: "call.ringing",
        callId: input.callId,
        providerCallId,
      }),
    );

    return { providerCallId, status: "initiated" };
  }

  async hangupCall(input: HangupCallInput): Promise<void> {
    const state = this.calls.get(input.providerCallId);
    if (!state) return;

    await this.client.safeHangupChannel(state.sipChannelId);
    await this.cleanup(input.providerCallId, input.reason);
  }

  async playTts(input: PlayTtsInput): Promise<void> {
    const state = this.calls.get(input.providerCallId);
    if (!state || !state.media) return;

    if (!this.ttsProvider) {
      throw new Error("Telephony TTS provider not configured for asterisk-ari");
    }
    const mulaw = await this.ttsProvider.synthesizeForTelephony(input.text);

    state.speaking = true;
    this.manager.processEvent(
      makeEvent({
        type: "call.speaking",
        callId: state.callId,
        providerCallId: state.providerCallId,
        text: input.text,
      }),
    );

    const rtpPeer = this.getRtpPeer(state);
    if (!rtpPeer) {
      // Wait until we receive at least one RTP packet from Asterisk (then we know its port).
      state.pendingMulaw = mulaw;
      console.warn("[ari] No RTP peer learned yet; queued TTS until RTP starts flowing");
      state.speaking = false;
      return;
    }

    this.sendMulawRtp(state, mulaw, rtpPeer);
  }

  async startListening(_input: StartListeningInput): Promise<void> {
    // STT is always-on in this architecture (via snoop)
  }

  async stopListening(_input: StopListeningInput): Promise<void> {
    // no-op
  }

  private async onAriEvent(evt: AriEvent) {
    if (evt.type === "StasisStart") {
      const args = evt.args || [];
      const providerCallId = args[0];

      // Inbound call: no appArgs provided
      if (!providerCallId) {
        const name = evt.channel?.name || "";
        // Ignore non-SIP channels (ExternalMedia/Snoop) entering Stasis
        if (!name.startsWith("PJSIP/") && !name.startsWith("SIP/")) {
          return;
        }
        await this.handleInboundStart(evt);
        return;
      }

      const state = this.calls.get(providerCallId);
      if (!state) return; // Maybe zombie call

      if (!state.media) {
        try {
          await this.setupMedia(state);
        } catch (err) {
          console.error("[ari] Media setup failed", err);
          this.manager.processEvent(
            makeEvent({
              type: "call.error",
              callId: state.callId,
              providerCallId: state.providerCallId,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
          await this.hangupCall({
            callId: state.callId,
            providerCallId: state.providerCallId,
            reason: "error",
          });
        }
      }
    } else if (evt.type === "StasisEnd") {
      const chId = evt.channel?.id;
      for (const [pId, state] of this.calls.entries()) {
        if (state.sipChannelId === chId) {
          await this.cleanup(pId, "hangup-user");
          break;
        }
      }
    }
  }

  private async setupMedia(state: CallState): Promise<void> {
    if (state.media) return;

    const media = await this.mediaFactory.createMediaGraph({ sipChannelId: state.sipChannelId });
    state.media = media;

    await this.seedRtpPeer(state);
    this.wireRtp(state);
    await this.setupStt(state);

    this.manager.processEvent(
      makeEvent({
        type: "call.answered",
        callId: state.callId,
        providerCallId: state.providerCallId,
      }),
    );

    this.manager.processEvent(
      makeEvent({
        type: "call.active",
        callId: state.callId,
        providerCallId: state.providerCallId,
      }),
    );
  }

  private async seedRtpPeer(state: CallState): Promise<void> {
    if (!state.media || state.rtpPeer) return;
    try {
      const portStr = await this.client.getChannelVar(state.media.extChannelId, "UNICASTRTP_LOCAL_PORT");
      const addrStr = await this.client.getChannelVar(state.media.extChannelId, "UNICASTRTP_LOCAL_ADDRESS");
      const port = portStr ? Number(portStr) : null;
      const address = addrStr || this.cfg.rtpHost;
      if (port && address) {
        this.setRtpPeer(state, { address, port });
        console.log("[ari] seeded RTP peer", { address, port });
      }
    } catch {}
  }

  private wireRtp(state: CallState): void {
    if (!state.media) return;
    state.media.udp.on("message", (msg, rinfo) => {
      if (!state.rtpSeen) {
        state.rtpSeen = true;
        console.log("[ari] RTP in from Asterisk", { rinfo, bytes: msg.length });
      }
      const prev = this.getRtpPeer(state);
      if (!prev) {
        console.log("[ari] Learned RTP peer from Asterisk:", rinfo);
        this.setRtpPeer(state, rinfo);
      }

      const pending = state.pendingMulaw;
      if (pending && !state.speaking) {
        state.pendingMulaw = undefined;
        const peer = this.getRtpPeer(state) || rinfo;
        this.sendMulawRtp(state, pending, peer);
      }
    });
  }

  private getRtpPeer(state: CallState) {
    return state.rtpPeer;
  }

  private setRtpPeer(state: CallState, rinfo: { address: string; port: number }) {
    state.rtpPeer = rinfo;
  }

  private sendMulawRtp(state: CallState, mulaw: Buffer, peer: { address: string; port: number }) {
    if (!state.media) return;
    const udp = state.media.udp;
    state.speaking = true;
    const chunkIter = chunkAudio(mulaw, 160);
    let i = 0;
    const interval = setInterval(() => {
      if (!this.calls.has(state.providerCallId) || !state.speaking) {
        clearInterval(interval);
        state.speaking = false;
        return;
      }

      const next = chunkIter.next();
      if (next.done || !next.value) {
        clearInterval(interval);
        state.speaking = false;
        return;
      }

      const pkt = this.makeRtpPacket(state, next.value);
      if (i === 0) {
        try {
          console.log("[ari] RTP send", { bytes: pkt.length, to: peer, from: udp.address() });
        } catch {
          console.log("[ari] RTP send", { bytes: pkt.length, to: peer });
        }
      }
      udp.send(pkt, peer.port, peer.address, (err) => {
        if (err) {
          console.warn("[ari] RTP send error", err);
        }
      });
      i++;
    }, 20);
  }

  private ensureRtpState(state: CallState): { seq: number; ts: number; ssrc: number } {
    if (!state.rtpState) {
      state.rtpState = {
        seq: Math.floor(Math.random() * 0xffff),
        ts: Math.floor(Math.random() * 0xffffffff),
        ssrc: Math.floor(Math.random() * 0xffffffff),
      };
    }
    return state.rtpState;
  }

  private makeRtpPacket(state: CallState, payload: Buffer): Buffer {
    const r = this.ensureRtpState(state);
    const header = Buffer.alloc(12);
    header[0] = 0x80; // V=2, P=0, X=0, CC=0
    header[1] = 0x00; // M=0, PT=0 (PCMU)
    header.writeUInt16BE(r.seq & 0xffff, 2);
    header.writeUInt32BE(r.ts >>> 0, 4);
    header.writeUInt32BE(r.ssrc >>> 0, 8);

    r.seq = (r.seq + 1) & 0xffff;
    r.ts = (r.ts + 160) >>> 0; // 20ms @ 8kHz

    return Buffer.concat([header, payload]);
  }

  private stripRtpHeader(pkt: Buffer): Buffer {
    if (pkt.length < 12) return Buffer.alloc(0);
    const cc = pkt[0] & 0x0f;
    const hasExt = (pkt[0] & 0x10) !== 0;
    let headerLen = 12 + cc * 4;
    if (hasExt) {
      if (pkt.length < headerLen + 4) return Buffer.alloc(0);
      const extLen = pkt.readUInt16BE(headerLen + 2); // in 32-bit words
      headerLen += 4 + extLen * 4;
    }
    if (pkt.length <= headerLen) return Buffer.alloc(0);
    return pkt.subarray(headerLen);
  }

  private async setupStt(state: CallState): Promise<void> {
    if (!state.media) return;
    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      console.warn("[ari] STT disabled: OPENAI_API_KEY missing");
      return;
    }

    try {
      const session = new OpenAIRealtimeSTTProvider({
        apiKey,
        model: "gpt-4o-transcribe", // default
      }).createSession();

      await session.connect();
      console.log("[ari] STT connected");

      session.onTranscript((text) => {
        console.log("[ari] STT transcript -> call.speech", { text });
        this.manager.processEvent(
          makeEvent({
            type: "call.speech",
            callId: state.callId,
            providerCallId: state.providerCallId,
            transcript: text,
            isFinal: true,
          }),
        );
      });

      let loggedPayload = false;
      state.media.sttUdp.on("message", (msg) => {
        const payload = this.stripRtpHeader(msg);
        if (payload.length) {
          if (!loggedPayload) {
            loggedPayload = true;
            console.log("[ari] STT payload", {
              bytes: payload.length,
              head: payload.subarray(0, 8).toString("hex"),
            });
          }
          session.sendAudio(payload);
        }
      });

      state.stt = session;
      console.log("[ari] STT setup ok");
    } catch (err) {
      console.warn("[ari] STT setup failed", err);
    }
  }

  private async handleInboundStart(evt: AriEvent): Promise<void> {
    const sipChannelId = evt.channel?.id;
    if (!sipChannelId) return;

    const providerCallId = sipChannelId;
    const from = evt.channel?.caller?.number || "unknown";
    const to = evt.channel?.name || "unknown";

    this.manager.processEvent(
      makeEvent({
        type: "call.initiated",
        callId: providerCallId,
        providerCallId,
        direction: "inbound",
        from,
        to,
      }),
    );

    const call = this.manager.getCallByProviderCallId(providerCallId);
    if (!call) {
      return;
    }

    const state: CallState = {
      callId: call.callId,
      providerCallId,
      sipChannelId,
      speaking: false,
    };
    this.calls.set(providerCallId, state);

    try {
      await this.client.answerChannel(sipChannelId);
    } catch {}

    try {
      await this.setupMedia(state);
    } catch (err) {
      console.error("[ari] Inbound media setup failed", err);
      this.manager.processEvent(
        makeEvent({
          type: "call.error",
          callId: state.callId,
          providerCallId: state.providerCallId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      await this.hangupCall({
        callId: state.callId,
        providerCallId: state.providerCallId,
        reason: "error",
      });
    }
  }

  private async cleanup(providerCallId: string, reason: EndReason = "completed") {
    const state = this.calls.get(providerCallId);
    if (!state) return;

    this.calls.delete(providerCallId);

    if (state.sipChannelId) {
      await this.client.safeHangupChannel(state.sipChannelId).catch(() => {});
    }

    if (state.media) {
      await this.mediaFactory.teardown(state.media);
    }
    if (state.stt) {
      try {
        state.stt.close();
      } catch {}
      state.stt = undefined;
    }

    this.manager.processEvent(
      makeEvent({
        type: "call.ended",
        callId: state.callId,
        providerCallId: state.providerCallId,
        reason,
      }),
    );
  }
}
