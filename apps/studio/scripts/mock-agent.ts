import WebSocket from 'ws';

const STUDIO_URL = process.env.STUDIO_URL || 'ws://localhost:3000/ws';
const AGENT_ID = process.env.AGENT_ID || 'mock-agent';

console.log(`[MockAgent] Starting for ${AGENT_ID} connecting to ${STUDIO_URL}`);

const ws = new WebSocket(STUDIO_URL);

ws.on('open', async () => {
  console.log('[MockAgent] Connected');

  // Identify
  ws.send(JSON.stringify({
    event: 'agent:identify',
    agentId: AGENT_ID,
    timestamp: Date.now()
  }));

  // Start
  ws.send(JSON.stringify({
    event: 'agent:start',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      model: 'google/gemini-1.5-pro-mock',
      provider: 'google'
    }
  }));

  // Simulate logs
  const logs = [
    "Initializing agent core...",
    "Loading memory context...",
    "Connecting to Feishu...",
    "Received user message: 'Hello world'",
    "Thinking...",
    "Calling tool: web_search...",
    "Generating response...",
    "Reply sent."
  ];

  for (const log of logs) {
    await new Promise(r => setTimeout(r, 1500));
    ws.send(JSON.stringify({
      event: 'log',
      agentId: AGENT_ID,
      timestamp: Date.now(),
      payload: log
    }));
    
    // Simulate token usage bumps
    ws.send(JSON.stringify({
      event: 'agent:end', // Reusing this event for usage updates for charts, or we can use a specific one if charts support it. 
      // The chart listens for 'agent:end' to update usage points.
      agentId: AGENT_ID,
      timestamp: Date.now(),
      payload: {
        usage: {
          total: Math.floor(Math.random() * 100) + 50
        }
      }
    }));
  }

  // Finish
  await new Promise(r => setTimeout(r, 1000));
  ws.send(JSON.stringify({
    event: 'agent:end',
    agentId: AGENT_ID,
    timestamp: Date.now(),
    payload: {
      usage: {
        total: 1500
      },
      durationMs: 12000
    }
  }));

  console.log('[MockAgent] Finished session');
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('[MockAgent] Error:', err);
  process.exit(1);
});
