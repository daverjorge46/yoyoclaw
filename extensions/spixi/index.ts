import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { spixiPlugin } from "./src/channel.js";
import { setSpixiRuntime } from "./src/runtime.js";

const plugin = {
  id: "spixi",
  name: "Spixi",
  description: "Decentralized P2P messaging via Ixian network",
  register(api: OpenClawPluginApi) {
    setSpixiRuntime(api.runtime as any);
    api.registerChannel({ plugin: spixiPlugin });
  },
};

export default plugin;
