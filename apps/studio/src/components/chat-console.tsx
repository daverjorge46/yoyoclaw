"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ChatConsole() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'agent', text: string }[]>([]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {return;}
    
    const userMsg = message;
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/instances/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Ping failed: " + (data.error || "Unknown error"));
      } else {
        const reply = data.result?.payloads?.[0]?.text;
        if (reply) {
            setHistory(prev => [...prev, { role: 'agent', text: reply }]);
        }
        console.log("Ping response:", data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col max-h-[600px]">
      <CardHeader>
        <CardTitle>Test Console</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-md bg-zinc-50 dark:bg-zinc-900">
            {history.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white border text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    }`}>
                        <div className="text-xs opacity-70 mb-1 capitalize">{msg.role}</div>
                        <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
                    </div>
                </div>
            ))}
            {history.length === 0 && <div className="text-center text-zinc-400 text-sm py-10">No messages yet.</div>}
        </div>

        <form onSubmit={handleSend} className="flex w-full space-x-2">
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Send a message to agent..." 
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
