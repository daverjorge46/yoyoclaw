/**
 * RuvectorService - Manages ruvector client lifecycle
 *
 * Handles initialization and cleanup of the ruvector vector database connection.
 * Uses the RuvectorClient wrapper for actual database operations.
 */

import type { PluginLogger } from "clawdbot/plugin-sdk";

import { RuvectorClient } from "./client.js";
import type { RuvectorConfig } from "./config.js";
import type { RuvectorClientConfig } from "./types.js";

// Re-export for backwards compatibility
export type { RuvectorConfig } from "./config.js";

/**
 * Configuration for remote RuvectorService mode (URL-based connection).
 */
export type RuvectorServiceConfig = {
  /** Ruvector server URL */
  url: string;
  /** API key for authentication */
  apiKey?: string;
  /** Collection/namespace name */
  collection?: string;
  /** Connection timeout in milliseconds */
  timeoutMs?: number;
};

/**
 * Type guard to check if config is RuvectorServiceConfig (remote mode).
 */
function isRemoteConfig(config: RuvectorConfig | RuvectorServiceConfig): config is RuvectorServiceConfig {
  return "url" in config && typeof config.url === "string";
}

/**
 * Service class for managing ruvector vector database connections.
 * Implements the ClawdbotPluginService interface pattern.
 *
 * Supports two modes:
 * - Remote mode (RuvectorServiceConfig): connects to external ruvector server via URL
 * - Local mode (RuvectorConfig): uses local ruvector database with embeddings
 */
export class RuvectorService {
  private client: RuvectorClient | null = null;
  private remoteConfig: RuvectorServiceConfig | null = null;
  private logger: PluginLogger;
  private started = false;
  /** Exposed for legacy tool access - use getClient() for typed access */
  readonly url: string;
  readonly collection: string;

  constructor(config: RuvectorConfig | RuvectorServiceConfig, logger: PluginLogger) {
    this.logger = logger;

    if (isRemoteConfig(config)) {
      // Remote mode - store config for later connection
      this.remoteConfig = config;
      this.url = config.url;
      this.collection = config.collection ?? "clawdbot-memory";
      // Client will be initialized in start() for remote mode
      // For now, create a placeholder client with default dimension
      const clientConfig: RuvectorClientConfig = {
        dimension: 1536, // Default OpenAI embedding dimension
        metric: "cosine",
      };
      this.client = new RuvectorClient(clientConfig, logger);
    } else {
      // Local mode - create client immediately
      const clientConfig: RuvectorClientConfig = {
        dimension: config.dimension,
        storagePath: config.dbPath,
        metric: config.metric,
      };
      this.client = new RuvectorClient(clientConfig, logger);
      this.url = config.dbPath;
      this.collection = "default";
    }
  }

  /**
   * Initialize the ruvector client connection.
   * Called when the plugin service starts.
   */
  async start(): Promise<void> {
    if (this.started) {
      this.logger.warn("ruvector: service already started");
      return;
    }

    if (!this.client) {
      throw new Error("ruvector: client not initialized");
    }

    try {
      await this.client.connect();
      this.started = true;
    } catch (err) {
      this.logger.error(`ruvector: failed to connect: ${String(err)}`);
      throw err;
    }
  }

  /**
   * Cleanup and close the ruvector connection.
   * Called when the plugin service stops.
   */
  async stop(): Promise<void> {
    if (!this.started || !this.client) {
      return;
    }

    try {
      await this.client.disconnect();
      this.started = false;
    } catch (err) {
      this.logger.warn(`ruvector: error during disconnect: ${String(err)}`);
      this.started = false;
    }
  }

  /**
   * Get the initialized ruvector client.
   * Throws if the service has not been started.
   */
  getClient(): RuvectorClient {
    if (!this.client) {
      throw new Error("ruvector: client not initialized");
    }
    if (!this.started || !this.client.isConnected()) {
      throw new Error("ruvector: service not started - call start() first");
    }
    return this.client;
  }

  /**
   * Check if the service is running and connected.
   */
  isRunning(): boolean {
    return this.started && this.client !== null && this.client.isConnected();
  }

  /**
   * Legacy compatibility: check connection status.
   * @deprecated Use isRunning() instead.
   */
  isConnected(): boolean {
    return this.isRunning();
  }

  /**
   * Legacy compatibility: close the connection.
   * @deprecated Use stop() instead.
   */
  async close(): Promise<void> {
    return this.stop();
  }
}
