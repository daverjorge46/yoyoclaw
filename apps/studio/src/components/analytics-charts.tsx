"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getModelCost } from "@/lib/model-catalog";

interface AnalyticsChartsProps {
  agentId: string;
}

interface DataPoint {
  time: string;
  tokens: number;
}

export function AnalyticsCharts({ agentId }: AnalyticsChartsProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    // In a real app, fetch historical data here
    // And subscribe to real-time updates for "agent:end" events to add points
    
    // Mock data for prototype
    setData([
      { time: '10:00', tokens: 120 },
      { time: '10:05', tokens: 450 },
      { time: '10:10', tokens: 300 },
      { time: '10:15', tokens: 800 },
      { time: '10:20', tokens: 200 },
    ]);
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", agentId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === "agent:end" && msg.payload?.usage?.total) {
          const usage = msg.payload.usage;
          const modelId = msg.payload.model || 'gpt-4o'; // fallback
          
          setData(prev => [
            ...prev, 
            { 
              time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              tokens: usage.total 
            }
          ].slice(-20)); // Keep last 20 points

          // Calculate cost
          const costInfo = getModelCost(modelId);
          if (costInfo) {
             const inputCost = (usage.input || 0) * costInfo.input / 1_000_000;
             const outputCost = (usage.output || 0) * costInfo.output / 1_000_000;
             setTotalCost(prev => prev + inputCost + outputCost);
          }
        }
      } catch (e) {}
    };
    
    return () => ws.close();

  }, [agentId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Token Usage (Real-time)</CardTitle>
        <div className="text-right">
            <p className="text-sm text-muted-foreground">Session Cost</p>
            <p className="text-xl font-bold text-green-600">${totalCost.toFixed(6)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="tokens" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
