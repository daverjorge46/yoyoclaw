/** Shared constants, types, and helpers for Ollama modules. */

export const OLLAMA_BASE_URL = "http://127.0.0.1:11434";

export type OllamaModel = {
  name: string;
  size: number;
  modifiedAt: string;
  digest: string;
};

export type OllamaRunningModel = {
  name: string;
  size: number;
  sizeVram: number;
  digest: string;
  expiresAt: string;
};

/** GET+JSON with timeout. */
export async function ollamaGet(url: string, timeoutMs = 3000): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Probe a URL, returning true if reachable. */
export async function ollamaProbe(url: string, method = "GET", timeoutMs = 3000): Promise<boolean> {
  try {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}
