import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { simplexPlugin } from "./src/channel.js";
import { setSimplexRuntime } from "./src/runtime.js";

const plugin = {
  id: "simplex",
  name: "SimpleX",
  description: "SimpleX Chat channel plugin via bot API",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setSimplexRuntime(api.runtime);
    api.registerChannel({ plugin: simplexPlugin });
  },
};

export default plugin;
