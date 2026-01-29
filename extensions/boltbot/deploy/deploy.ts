#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
}

async function main() {
  const privateKey = required("ECLOUD_PRIVATE_KEY");
  const environment = process.env.ECLOUD_ENVIRONMENT ?? "sepolia";
  const appName = process.env.ECLOUD_APP_NAME ?? "boltbot";
  const instanceType = process.env.ECLOUD_INSTANCE_TYPE ?? "e2-medium";

  const envVars: Record<string, string> = {
    EIGENCLOUD_API_KEY: required("EIGENCLOUD_API_KEY"),
    TELEGRAM_BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
    BOLTBOT_RECEIPT_BACKEND: process.env.BOLTBOT_RECEIPT_BACKEND ?? "eigenda",
    NODE_ENV_PUBLIC: "production",
  };
  if (process.env.EIGENDA_PROXY_URL) {
    envVars.EIGENDA_PROXY_URL = process.env.EIGENDA_PROXY_URL;
  }

  console.log(`Deploying ${appName} to EigenCompute (${environment})...`);

  const ecloudEnv = { ...process.env, ECLOUD_PRIVATE_KEY: privateKey };

  console.log("[1/3] Building Docker image...");
  execFileSync("docker", [
    "build", "-t", `${appName}:latest`,
    "-f", "extensions/boltbot/deploy/Dockerfile", ".",
  ], { cwd: projectRoot, stdio: "inherit" });

  console.log("[2/3] Deploying to EigenCompute TEE...");
  const envFlags = Object.entries(envVars).flatMap(([k, v]) => ["--env", `${k}=${v}`]);
  execFileSync("npx", [
    "@layr-labs/ecloud-cli", "compute", "app", "deploy",
    "--name", appName,
    "--instance-type", instanceType,
    "--environment", environment,
    "--dockerfile", "extensions/boltbot/deploy/Dockerfile",
    ...envFlags,
  ], { cwd: projectRoot, stdio: "inherit", env: ecloudEnv });

  console.log("[3/3] Fetching deployment info...");
  execFileSync("npx", [
    "@layr-labs/ecloud-cli", "compute", "app", "info",
    "--name", appName,
  ], { cwd: projectRoot, stdio: "inherit", env: ecloudEnv });

  console.log("\nDone. Next: ecloud compute app configure tls");
}

main();
