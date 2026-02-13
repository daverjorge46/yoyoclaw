import type { GatewayRequestHandlers } from "./types.js";
import { buildAllowedModelSet, modelKey, resolveConfiguredModelRef } from "../../agents/model-selection.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../../agents/defaults.js";
import { loadConfig } from "../../config/config.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateModelsListParams,
} from "../protocol/index.js";

export const modelsHandlers: GatewayRequestHandlers = {
  "models.list": async ({ params, respond, context }) => {
    if (!validateModelsListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid models.list params: ${formatValidationErrors(validateModelsListParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const models = await context.loadGatewayModelCatalog();
      const cfg = loadConfig();
      const defaultRef = resolveConfiguredModelRef({
        cfg,
        defaultProvider: DEFAULT_PROVIDER,
        defaultModel: DEFAULT_MODEL,
      });
      const allowed = buildAllowedModelSet({
        cfg,
        catalog: models,
        defaultProvider: defaultRef.provider,
        defaultModel: defaultRef.model,
      });
      const modelsWithPolicy = models.map((entry) => ({
        ...entry,
        allowed: allowed.allowAny || allowed.allowedKeys.has(modelKey(entry.provider, entry.id)),
      }));
      respond(true, { models: modelsWithPolicy }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
