import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import path from "path";

// Default dev token for local development (must match gateway config)
const DEV_TOKEN = "dev-token-local";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gatewayToken = env.OPENCLAW_GATEWAY_TOKEN || env.VITE_GATEWAY_TOKEN || DEV_TOKEN;
  const gatewayUrl = env.VITE_GATEWAY_URL || "http://127.0.0.1:18789";
  const gatewayWsUrl = gatewayUrl.replace(/^http/, "ws");

  return {
    plugins: [
      // TanStack Router must be before React plugin
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@clawdbrain/vercel-ai-agent": path.resolve(__dirname, "../../packages/vercel-ai-agent/dist/index.js"),
      },
    },
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      fs: {
        allow: [path.resolve(__dirname, "../..")],
      },
      proxy: {
        "/ws": {
          target: gatewayWsUrl,
          ws: true,
          rewrite: (p) => `${p}${p.includes("?") ? "&" : "?"}token=${encodeURIComponent(gatewayToken)}`,
        },
        "/api": {
          target: gatewayUrl,
          changeOrigin: true,
          headers: {
            Authorization: `Bearer ${gatewayToken}`,
          },
        },
      },
    },
  };
});
