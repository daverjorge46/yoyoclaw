"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface LogEvent {
  event: string;
  payload: any;
  timestamp: number;
}

interface KanbanBoardProps {
  agentId: string;
}

export function KanbanBoard({ agentId }: KanbanBoardProps) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [status, setStatus] = useState("Idle");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WS
    // Note: We use standard WebSocket, assuming server is on same host:port
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to Studio WS");
      ws.send(JSON.stringify({ type: "subscribe", agentId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event) {
          setLogs((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
          
          if (data.event === "agent:start") {
            setStatus("Running");
          } else if (data.event === "agent:end") {
            setStatus("Idle");
          }
        }
      } catch (e) {
        console.error("Failed to parse log", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [agentId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Status: {status}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-center py-8">
            {status === "Running" ? "🟢" : "zzz"}
          </div>
        </CardContent>
      </Card>

      <Card className="h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle>Live Logs</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto bg-zinc-950 text-zinc-50 p-4 rounded-md font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="mb-1 border-b border-zinc-800 pb-1 last:border-0">
              <span className="text-zinc-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
              <span className="text-blue-400">{log.event}</span>:{" "}
              <span className="text-zinc-300">
                {typeof log.payload === 'object' ? JSON.stringify(log.payload) : String(log.payload)}
              </span>
            </div>
          ))}
          {logs.length === 0 && <div className="text-zinc-600 italic">Waiting for telemetry...</div>}
        </CardContent>
      </Card>
    </div>
  );
}
