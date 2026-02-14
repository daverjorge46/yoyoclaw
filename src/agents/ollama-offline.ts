import { OLLAMA_BASE_URL, ollamaProbe } from "./ollama-shared.js";

export interface OfflineCapabilities {
  canInfer: boolean;
  canPullModels: boolean;
  canUseCloudProviders: boolean;
  status: "full" | "local-only" | "no-models" | "no-ollama";
  message: string;
}

export interface ConnectivityStatus {
  online: boolean;
  ollama: boolean;
  internet: boolean;
}

export async function checkConnectivity(): Promise<ConnectivityStatus> {
  const [ollama, internet] = await Promise.all([
    ollamaProbe(`${OLLAMA_BASE_URL}/api/version`),
    ollamaProbe("https://1.1.1.1", "HEAD", 2000),
  ]);
  return { online: ollama || internet, ollama, internet };
}

const modelList = (models: string[]) =>
  `${models.length} model${models.length === 1 ? "" : "s"}: ${models.join(", ")}`;

export function getOfflineCapabilities(
  ollamaAvailable: boolean,
  modelsLoaded: string[],
): OfflineCapabilities {
  if (!ollamaAvailable)
    return { canInfer: false, canPullModels: false, canUseCloudProviders: false, status: "no-ollama",
      message: "Ollama is not running. Start it with `ollama serve` to enable local inference." };
  if (modelsLoaded.length === 0)
    return { canInfer: false, canPullModels: true, canUseCloudProviders: false, status: "no-models",
      message: "Ollama is running but no models are loaded. Pull a model with `ollama pull <model>`." };
  return { canInfer: true, canPullModels: true, canUseCloudProviders: false, status: "full",
    message: `Local inference ready with ${modelList(modelsLoaded)}` };
}

export async function getStatus(modelsLoaded: string[]): Promise<OfflineCapabilities> {
  const conn = await checkConnectivity();
  const caps = getOfflineCapabilities(conn.ollama, modelsLoaded);
  if (conn.ollama && modelsLoaded.length > 0 && !conn.internet)
    return { ...caps, canPullModels: false, canUseCloudProviders: false, status: "local-only",
      message: `Offline but fully functional with ${modelList(modelsLoaded)}` };
  if (conn.internet) caps.canUseCloudProviders = true;
  return caps;
}
