/**
 * memory-smart — Clawdbot/OpenClaw plugin
 *
 * Smart AI-powered memory with provider-agnostic embeddings,
 * core memory block, entity profiles, auto-recall, AI fact extraction,
 * auto-capture, and background reflection.
 */

import { join } from "node:path";
import { homedir } from "node:os";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { memorySmartConfigSchema, vectorDimsForModel } from "./config.js";
import { createEmbeddingProvider } from "./providers/factory.js";
import { MemoryDB } from "./store/memory-db.js";
import { EntityDB } from "./store/entity-db.js";
import { CoreMemoryManager } from "./store/core-memory.js";
import { registerMemoryRecallTool } from "./tools/memory-recall.js";
import { registerMemoryStoreTool } from "./tools/memory-store.js";
import { registerMemoryForgetTool } from "./tools/memory-forget.js";
import { registerCoreMemoryUpdateTool } from "./tools/core-memory-update.js";
import { registerEntityLookupTool } from "./tools/entity-lookup.js";
import { registerAutoRecall } from "./lifecycle/auto-recall.js";
import { ExtractionQueue } from "./extraction/queue.js";
import { EntityResolver } from "./extraction/entity-resolver.js";
import { registerAutoCapture } from "./lifecycle/auto-capture.js";
import { registerReflection } from "./lifecycle/reflection.js";
import { registerCli } from "./cli/commands.js";

// ============================================================================
// Plugin Definition
// ============================================================================

const memorySmartPlugin = {
  id: "memory-smart",
  name: "Memory (Smart)",
  description:
    "AI-powered memory with provider-agnostic embeddings, core memory, entity profiles, and auto-recall",
  kind: "memory" as const,
  configSchema: memorySmartConfigSchema,

  register(api: OpenClawPluginApi) {
    const cfg = memorySmartConfigSchema.parse(api.pluginConfig);
    const vectorDim = vectorDimsForModel(cfg.embedding.model);
    const resolvedDbPath = api.resolvePath(cfg.store.dbPath);

    // --- Create providers ---
    const embeddings = createEmbeddingProvider(cfg.embedding);

    // --- Create stores ---
    const memoryDb = new MemoryDB(resolvedDbPath, vectorDim);
    const entityDb = new EntityDB(resolvedDbPath, vectorDim);

    const coreMemoryPath = api.resolvePath(cfg.coreMemory.filePath);
    const coreMemory = new CoreMemoryManager(
      coreMemoryPath,
      cfg.coreMemory.maxTokens,
    );

    api.logger.info(
      `memory-smart: registered (provider: ${cfg.embedding.provider}, model: ${cfg.embedding.model}, dims: ${vectorDim}, db: ${resolvedDbPath})`,
    );

    // ========================================================================
    // Tools
    // ========================================================================

    registerMemoryRecallTool(api, memoryDb, embeddings);
    registerMemoryStoreTool(api, memoryDb, embeddings);
    registerMemoryForgetTool(api, memoryDb, embeddings);

    if (cfg.coreMemory.enabled) {
      registerCoreMemoryUpdateTool(api, coreMemory);
    }

    if (cfg.entities.enabled) {
      registerEntityLookupTool(api, entityDb, memoryDb, embeddings);
    }

    // ========================================================================
    // Extraction & Intelligence Layer
    // ========================================================================

    const queuePath = join(
      homedir(),
      ".openclaw",
      "memory",
      "extraction-queue.json",
    );
    const extractionQueue = new ExtractionQueue(queuePath);

    const entityResolver = new EntityResolver(
      entityDb,
      embeddings,
      cfg.entities.minMentionsToCreate,
    );

    // ========================================================================
    // Lifecycle Hooks
    // ========================================================================

    if (cfg.autoRecall.enabled) {
      registerAutoRecall(api, {
        memoryDb,
        entityDb,
        coreMemory,
        embeddings,
        autoRecallConfig: cfg.autoRecall,
        entitiesConfig: cfg.entities,
        coreMemoryEnabled: cfg.coreMemory.enabled,
      });
    }

    if (cfg.autoCapture.enabled) {
      registerAutoCapture(api, extractionQueue, cfg);
      api.logger.info("memory-smart: auto-capture enabled (queuing conversations for extraction)");
    }

    // ========================================================================
    // Reflection (background maintenance)
    // ========================================================================

    // Default no-op functions for when reflection is disabled
    let triggerReflection: () => Promise<any> = async () => {
      console.log("  Reflection is disabled in config.");
      return null;
    };
    let getLastStats: () => any = () => null;

    if (cfg.reflection.enabled) {
      const reflectionControls = registerReflection(
        api,
        extractionQueue,
        memoryDb,
        entityDb,
        embeddings,
        entityResolver,
        coreMemory,
        cfg,
      );
      triggerReflection = reflectionControls.triggerReflection;
      getLastStats = reflectionControls.getLastStats;
      api.logger.info(
        `memory-smart: reflection enabled (interval: ${cfg.reflection.intervalMinutes}min)`,
      );
    }

    // ========================================================================
    // CLI Commands
    // ========================================================================

    registerCli({
      api,
      memoryDb,
      entityDb,
      coreMemory,
      queue: extractionQueue,
      embeddings,
      entityResolver,
      cfg,
      resolvedDbPath,
      triggerReflection,
      getLastStats,
    });

    // ========================================================================
    // Service
    // ========================================================================

    api.registerService({
      id: "memory-smart",
      start: () => {
        api.logger.info(
          `memory-smart: service started (provider: ${cfg.embedding.provider}, model: ${cfg.embedding.model})`,
        );
      },
      stop: () => {
        api.logger.info("memory-smart: service stopped");
      },
    });
  },
};

export default memorySmartPlugin;
