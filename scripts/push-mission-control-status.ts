#!/usr/bin/env npx tsx
/**
 * Push OpenClaw session status to Mission Control dashboard
 * 
 * Run via: npx tsx scripts/push-mission-control-status.ts
 * Or add to cron for periodic updates
 */

const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'https://dbh-mission-control.vercel.app';
const MISSION_CONTROL_TOKEN = process.env.MISSION_CONTROL_TOKEN || 'mc-dev-token';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3284';

// Agent ID mapping from session labels/keys
const AGENT_PATTERNS: Record<string, RegExp> = {
  scout: /scout|research/i,
  builder: /builder|dev|code/i,
  scribe: /scribe|content|write/i,
  analyst: /analyst|data|finance/i,
  canvas: /canvas|design|art/i,
  sentinel: /sentinel|security|qa/i,
  steve: /steve|main|orchestrat/i,
};

interface Session {
  key: string;
  kind: string;
  channel: string;
  displayName?: string;
  updatedAt: number;
  sessionId: string;
  model: string;
  totalTokens: number;
  messages?: { content?: { type: string; text?: string }[] }[];
}

interface AgentStatus {
  id: string;
  name: string;
  status: 'WORKING' | 'STANDBY' | 'ERROR';
  sessionKey?: string;
  currentTask?: string;
  model?: string;
  lastActive: string;
  totalTokens?: number;
}

function identifyAgent(session: Session): string | null {
  const searchText = `${session.key} ${session.displayName || ''}`.toLowerCase();
  
  for (const [agentId, pattern] of Object.entries(AGENT_PATTERNS)) {
    if (pattern.test(searchText)) {
      return agentId;
    }
  }
  
  // Check if it's a spawned sub-agent with a label
  if (session.key.includes(':label:')) {
    const label = session.key.split(':label:')[1]?.split(':')[0];
    if (label) {
      for (const [agentId, pattern] of Object.entries(AGENT_PATTERNS)) {
        if (pattern.test(label)) {
          return agentId;
        }
      }
    }
  }
  
  return null;
}

function isRecentlyActive(updatedAt: number): boolean {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return updatedAt > fiveMinutesAgo;
}

function formatLastActive(updatedAt: number): string {
  const now = Date.now();
  const diff = now - updatedAt;
  
  if (diff < 60000) return 'Now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  return `${Math.floor(diff / 86400000)} day ago`;
}

async function fetchSessions(): Promise<Session[]> {
  // This would call the gateway's internal API
  // For now, we'll use a simplified approach
  try {
    const response = await fetch(`${GATEWAY_URL}/api/sessions`, {
      headers: {
        'Authorization': `Bearer ${process.env.GATEWAY_TOKEN || ''}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.sessions || [];
    }
  } catch (error) {
    console.error('Failed to fetch sessions from gateway:', error);
  }
  
  return [];
}

async function pushStatus(agents: AgentStatus[]): Promise<void> {
  const response = await fetch(`${MISSION_CONTROL_URL}/api/agents/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: MISSION_CONTROL_TOKEN,
      agents,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to push status: ${response.status}`);
  }

  const result = await response.json();
  console.log('Status pushed:', result);
}

async function main() {
  console.log('Fetching OpenClaw sessions...');
  
  const sessions = await fetchSessions();
  console.log(`Found ${sessions.length} sessions`);

  // Build agent status from sessions
  const agentMap = new Map<string, AgentStatus>();
  
  // Initialize all agents as STANDBY
  const defaultAgents = ['scout', 'builder', 'scribe', 'analyst', 'canvas', 'sentinel', 'steve'];
  const agentNames: Record<string, string> = {
    scout: 'Scout',
    builder: 'Builder',
    scribe: 'Scribe',
    analyst: 'Analyst',
    canvas: 'Canvas',
    sentinel: 'Sentinel',
    steve: 'Steve',
  };
  
  for (const id of defaultAgents) {
    agentMap.set(id, {
      id,
      name: agentNames[id],
      status: 'STANDBY',
      lastActive: '-',
    });
  }

  // Update based on active sessions
  for (const session of sessions) {
    const agentId = identifyAgent(session);
    if (!agentId) continue;

    const isActive = isRecentlyActive(session.updatedAt);
    const existing = agentMap.get(agentId);
    
    if (existing) {
      // Update if this session is more recent or is actively working
      if (isActive || !existing.sessionKey) {
        agentMap.set(agentId, {
          ...existing,
          status: isActive ? 'WORKING' : 'STANDBY',
          sessionKey: session.key,
          model: session.model,
          lastActive: formatLastActive(session.updatedAt),
          totalTokens: session.totalTokens,
        });
      }
    }
  }

  // Steve (main agent) is always working if the gateway is running
  const steve = agentMap.get('steve');
  if (steve) {
    steve.status = 'WORKING';
    steve.lastActive = 'Now';
  }

  const agents = Array.from(agentMap.values());
  console.log('Agent statuses:', agents.map(a => `${a.name}: ${a.status}`).join(', '));

  await pushStatus(agents);
}

main().catch(console.error);
