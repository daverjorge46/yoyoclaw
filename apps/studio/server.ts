import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url || "/", true);
    
    // Only handle upgrades for our specific path
    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      // Let Next.js (or other listeners) handle it.
      // Important: Do not destroy the socket here if Next.js needs it.
      // However, Node.js http server emits 'upgrade' and if no one handles it, it closes.
      // Next.js attaches its own upgrade listener.
    }
  });

  // Map to store clients: agentId -> Set<WebSocket> (UI clients)
  // And maybe a way to identify agents. 
  // Simplified: All UI clients receive all events for now, or we filter.
  // Better: Subscribe mechanism.
  
  const subscriptions = new Map<string, Set<WebSocket>>(); // agentId -> Set<UI Sockets>

  wss.on("connection", (ws) => {
    // console.log("New WS connection");

    ws.on("message", (message) => {
      try {
        const str = message.toString();
        const data = JSON.parse(str);
        
        // Handle subscription from UI
        if (data.type === "subscribe") {
          const { agentId } = data;
          if (agentId) {
            if (!subscriptions.has(agentId)) {
              subscriptions.set(agentId, new Set());
            }
            subscriptions.get(agentId)!.add(ws);
            // console.log(`Client subscribed to ${agentId}`);
          }
          return;
        }

        // Handle telemetry from Agent
        // Expected format from StudioTelemetry: { event, payload, timestamp, agentId }
        if (data.agentId && data.event) {
          const { agentId } = data;
          const room = subscriptions.get(agentId);
          if (room) {
            // Forward to all subscribers
            for (const client of room) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(str);
              }
            }
          } else {
             // Maybe no one is listening yet, that's fine.
          }
        }

      } catch (e) {
        // console.error("Failed to parse WS message", e);
      }
    });

    ws.on("close", () => {
      // Remove from subscriptions
      for (const [agentId, clients] of subscriptions.entries()) {
        clients.delete(ws);
        if (clients.size === 0) {
          subscriptions.delete(agentId);
        }
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});