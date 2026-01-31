/**
 * Health Check Endpoint
 * Returns status of all services
 */

import type { IncomingMessage, ServerResponse } from "node:http";

const startTime = Date.now();
const VERSION = "1.0.0";

interface ServiceStatus {
  name: string;
  status: "ok" | "degraded" | "down";
  message?: string;
}

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  uptime: number;
  uptimeFormatted: string;
  timestamp: string;
  services: ServiceStatus[];
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

async function checkGatewayStatus(): Promise<ServiceStatus> {
  return { name: "gateway", status: "ok", message: "API server running" };
}

async function checkAuthStatus(): Promise<ServiceStatus> {
  const hasJwtSecret = !!process.env.JWT_SECRET;
  const hasAdminHash = !!process.env.ADMIN_PASSWORD_HASH;
  
  if (hasJwtSecret && hasAdminHash) {
    return { name: "auth", status: "ok", message: "JWT authentication configured" };
  }
  if (hasJwtSecret || hasAdminHash) {
    return { name: "auth", status: "degraded", message: "Partial auth configuration" };
  }
  return { name: "auth", status: "down", message: "Auth not configured" };
}

async function checkEncryptionStatus(): Promise<ServiceStatus> {
  const hasKey = !!process.env.MASTER_ENCRYPTION_KEY;
  return hasKey
    ? { name: "encryption", status: "ok", message: "AES-256-GCM encryption ready" }
    : { name: "encryption", status: "degraded", message: "Using default key (not production safe)" };
}

async function checkTermiiStatus(): Promise<ServiceStatus> {
  const hasKey = !!process.env.TERMII_API_KEY;
  return hasKey
    ? { name: "termii", status: "ok", message: "SMS/Voice integration ready" }
    : { name: "termii", status: "degraded", message: "API key not configured" };
}

async function checkPaystackStatus(): Promise<ServiceStatus> {
  const hasKey = !!process.env.PAYSTACK_SECRET_KEY;
  return hasKey
    ? { name: "paystack", status: "ok", message: "Payment integration ready" }
    : { name: "paystack", status: "degraded", message: "API key not configured" };
}

async function checkWhatsAppStatus(): Promise<ServiceStatus> {
  const hasToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
  return hasToken
    ? { name: "whatsapp", status: "ok", message: "WhatsApp Business API ready" }
    : { name: "whatsapp", status: "degraded", message: "Access token not configured" };
}

export async function getHealthStatus(): Promise<HealthResponse> {
  const services = await Promise.all([
    checkGatewayStatus(),
    checkAuthStatus(),
    checkEncryptionStatus(),
    checkTermiiStatus(),
    checkPaystackStatus(),
    checkWhatsAppStatus(),
  ]);

  const hasDown = services.some(s => s.status === "down");
  const hasDegraded = services.some(s => s.status === "degraded");
  
  const uptime = Date.now() - startTime;

  return {
    status: hasDown ? "down" : hasDegraded ? "degraded" : "ok",
    version: VERSION,
    uptime,
    uptimeFormatted: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    services,
  };
}

export async function handleHealthRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  
  if (url.pathname !== "/health") {
    return false;
  }

  const health = await getHealthStatus();
  
  res.statusCode = health.status === "down" ? 503 : 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(health, null, 2));
  
  return true;
}
