import { OLLAMA_BASE_URL, ollamaGet } from "./ollama-shared.js";
import type { OllamaModel, OllamaRunningModel } from "./ollama-shared.js";

export type { OllamaModel, OllamaRunningModel } from "./ollama-shared.js";

export type OllamaHealthStatus =
  | { healthy: true; version: string }
  | { healthy: false; error: string };

export type OllamaStatusInfo = {
  health: OllamaHealthStatus;
  models: OllamaModel[];
  running: OllamaRunningModel[];
};

export async function checkOllamaHealth(
  baseUrl: string = OLLAMA_BASE_URL,
): Promise<OllamaHealthStatus> {
  try {
    const data = (await ollamaGet(`${baseUrl}/api/version`)) as Record<string, unknown>;
    return typeof data?.version === "string"
      ? { healthy: true, version: data.version }
      : { healthy: false, error: "Unexpected response from /api/version" };
  } catch (err: any) {
    return {
      healthy: false,
      error: err?.name === "AbortError" || err?.name === "TimeoutError"
        ? "Connection timed out"
        : String(err?.message ?? err),
    };
  }
}

export async function listOllamaModels(baseUrl: string = OLLAMA_BASE_URL): Promise<OllamaModel[]> {
  try {
    const data = (await ollamaGet(`${baseUrl}/api/tags`)) as { models?: any[] };
    return (data.models ?? []).map((m: any) => ({
      name: String(m.name ?? ""),
      size: Number(m.size ?? 0),
      modifiedAt: String(m.modified_at ?? m.modifiedAt ?? ""),
      digest: String(m.digest ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function getOllamaRunningModels(
  baseUrl: string = OLLAMA_BASE_URL,
): Promise<OllamaRunningModel[]> {
  try {
    const data = (await ollamaGet(`${baseUrl}/api/ps`)) as { models?: any[] };
    return (data.models ?? []).map((m: any) => ({
      name: String(m.name ?? ""),
      size: Number(m.size ?? 0),
      sizeVram: Number(m.size_vram ?? m.sizeVram ?? 0),
      digest: String(m.digest ?? ""),
      expiresAt: String(m.expires_at ?? m.expiresAt ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function getOllamaStatus(
  baseUrl: string = OLLAMA_BASE_URL,
): Promise<OllamaStatusInfo> {
  const [health, models, running] = await Promise.all([
    checkOllamaHealth(baseUrl),
    listOllamaModels(baseUrl),
    getOllamaRunningModels(baseUrl),
  ]);
  return { health, models, running };
}
