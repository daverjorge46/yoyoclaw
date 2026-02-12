/**
 * OpenClaw Matrix Channel Plugin — Phase 2
 *
 * Entry point for the plugin. Registers the Matrix channel with OpenClaw.
 * Uses @matrix-org/matrix-sdk-crypto-nodejs for E2E encryption.
 */

import { matrixChannelPlugin } from "./src/channel.js";
import { setMatrixRuntime } from "./src/runtime.js";
import type { OpenClawPluginApi } from "./src/openclaw-types.js";

const plugin = {
  id: "claw-matrix",
  name: "Matrix (Rust Crypto)",
  description: "Matrix channel plugin with E2E encryption",

  register(api: OpenClawPluginApi) {
    setMatrixRuntime(api.runtime);
    api.registerChannel({ plugin: matrixChannelPlugin });
    api.logger?.info?.("[claw-matrix] Channel plugin registered");
  },
};

export default plugin;
