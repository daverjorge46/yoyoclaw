import type { PluginRuntime } from "./openclaw-types.js";

// SINGLETON: multi-account requires refactoring this to per-account state
let runtime: PluginRuntime | null = null;

export function setMatrixRuntime(next: PluginRuntime) {
  runtime = next;
}

export function getMatrixRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("Matrix runtime not initialized");
  }
  return runtime;
}
