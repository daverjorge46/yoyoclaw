import WebSocket from "ws";

export class StudioTelemetry {
  private static instance: StudioTelemetry;
  private ws: WebSocket | null = null;
  private url: string;
  private isConnected = false;
  private queue: any[] = [];

  private constructor() {
    const studioUrl = process.env.STUDIO_URL;
    if (studioUrl) {
      // Convert http/https to ws/wss if necessary
      this.url = studioUrl.replace(/^http/, "ws");
      if (!this.url.endsWith("/ws")) {
        this.url = this.url.replace(/\/$/, "") + "/ws";
      }
      this.connect();
    } else {
      this.url = "";
    }
  }

  public static getInstance(): StudioTelemetry {
    if (!StudioTelemetry.instance) {
      StudioTelemetry.instance = new StudioTelemetry();
    }
    return StudioTelemetry.instance;
  }

  private connect() {
    if (!this.url) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        console.log("[StudioTelemetry] Connected to Studio");
        this.isConnected = true;
        this.emit("agent:identify", {
          agentId: process.env.AGENT_ID || "default",
          timestamp: Date.now(),
        });
        this.flushQueue();
      });

      this.ws.on("error", (err) => {
        console.error("[StudioTelemetry] Connection error:", err);
        this.isConnected = false;
      });

      this.ws.on("close", () => {
        this.isConnected = false;
        // Simple reconnect backoff
        setTimeout(() => this.connect(), 5000);
      });
    } catch (e) {
      // console.error('[StudioTelemetry] Failed to initialize:', e);
    }
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.isConnected && this.ws) {
      const data = this.queue.shift();
      try {
        this.ws.send(JSON.stringify(data));
      } catch (e) {
        // Put back if failed? Or just drop to avoid blocking.
        // Dropping for now.
      }
    }
  }

  public emit(event: string, payload: any) {
    if (!this.url) {
      return;
    }

    const message = {
      event,
      payload,
      timestamp: Date.now(),
      agentId: process.env.AGENT_ID || "default",
    };

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        this.queue.push(message);
      }
    } else {
      if (this.queue.length < 1000) {
        // Limit queue size
        this.queue.push(message);
      }
    }
  }
}
