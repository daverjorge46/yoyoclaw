/**
 * Smart model router configuration types.
 * Router dynamically selects models based on user input.
 */

/**
 * Smart model router configuration.
 */
export type RouterConfig = {
  /**
   * Enable smart model routing based on dynamic selection.
   * When disabled, uses the default model for all tasks.
   * Default: false
   */
  enabled?: boolean;

  /**
   * Model used for dynamic model selection.
   * Should be a fast, low-cost model (e.g., "google/gemini-2.5-flash").
   * Format: "provider/model"
   */
  classifierModel?: string;

  /**
   * Timeout for selection LLM call in milliseconds.
   * Default: 10000
   */
  classificationTimeoutMs?: number;

  /**
   * Enable thinking/reasoning for the classifier model.
   * Ensure the model supports thinking (e.g., Gemini 2.0 Flash/Pro).
   * Default: false
   */
  thinking?: boolean;
};

import { z } from "zod";

export const RouterConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    classifierModel: z.string().optional(),
    classificationTimeoutMs: z.number().int().positive().optional(),
    thinking: z.boolean().optional(),
  })
  .strict()
  .optional();
