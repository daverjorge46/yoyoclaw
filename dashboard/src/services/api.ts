import axios from 'axios';

// Public sandbox URLs for the demo
const CLAWDBOT_API = 'https://18789-iu77qd9z8q30mhkjdpf6l-d0b9e1e2.sandbox.novita.ai';
const OPENPOKE_API = 'https://8000-iu77qd9z8q30mhkjdpf6l-d0b9e1e2.sandbox.novita.ai';
const AGENT_ZERO_API = 'https://8080-iu77qd9z8q30mhkjdpf6l-d0b9e1e2.sandbox.novita.ai';

export const fetchClawdbotLogs = async () => {
  try {
    const res = await axios.get(`${CLAWDBOT_API}/logs`);
    return res.data;
  } catch (error) {
    console.error("Clawdbot fetch failed", error);
    return [];
  }
};

export const fetchPokeMemories = async () => {
  try {
    const res = await axios.get(`${OPENPOKE_API}/memory`);
    return res.data;
  } catch (error) {
    console.error("Poke fetch failed", error);
    return { recent_memories: [] };
  }
};

export const fetchAgentZeroActivity = async () => {
  try {
    const res = await axios.get(`${AGENT_ZERO_API}/activity`);
    return res.data;
  } catch (error) {
    console.error("Agent Zero fetch failed", error);
    return { terminal_history: [] };
  }
};
