/**
 * PIC Standard – TypeScript types for the HTTP bridge protocol.
 *
 * These mirror the Python-side contracts defined in:
 *   sdk-python/pic_standard/integrations/http_bridge.py
 *   sdk-python/pic_standard/errors.py  (PICErrorCode)
 */
/** Sensible defaults matching PICEvaluateLimits on the Python side. */
export const DEFAULT_CONFIG = {
    bridge_url: "http://127.0.0.1:7580",
    bridge_timeout_ms: 500,
    log_level: "info",
};
