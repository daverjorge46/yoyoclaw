/**
 * Database infrastructure exports.
 */

export {
  getDatabase,
  closeDatabase,
  getDatabaseConfig,
  isDatabaseConnected,
  runMigrations,
  type DatabaseConfig,
} from "./client.js";

export type {
  LlmUsageRow,
  LlmUsageInsert,
  LlmUsageHourlyRow,
  UsageQueryFilter,
  UsageAggregation,
} from "./schema.js";

// SQLite fallback client
export {
  getSqlitePath,
  isSqliteAvailable,
  getSqliteDatabase,
  closeSqliteDatabase,
} from "./sqlite-client.js";

// Unified storage with auto-detection (PostgreSQL → SQLite → Memory)
export {
  initializeStorage,
  getStorageBackend,
  isStorageAvailable,
  recordUsageUnified,
  queryUsageUnified,
  type StorageBackend,
} from "./unified-store.js";
