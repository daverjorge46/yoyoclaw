import type { OpenClawPluginApi, OpenClawPluginToolContext } from "openclaw/plugin-sdk";
import { jsonResult } from "openclaw/plugin-sdk";
import { resolveGoogleDriveCredentials } from "./credentials.js";
import { readGoogleDocs } from "./docs-read.js";
import { downloadGoogleDriveFile } from "./drive-download.js";
import { getGoogleDriveFile } from "./drive-get.js";
import { listGoogleDriveFiles } from "./drive-list.js";
import { GoogleDriveSchema, type GoogleDriveParams } from "./schema.js";

export function registerGoogleDriveTools(api: OpenClawPluginApi) {
  if (!api.config) {
    api.logger.debug?.("google_drive: No config available, skipping drive tools");
    return;
  }

  // Use a factory function to capture context values
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "google_drive",
      label: "Google Drive",
      description:
        "Browse Google Drive, get file metadata, download files, and read Google Docs. Actions: list, get, download, read_docs",
      parameters: GoogleDriveSchema,
      async execute(_toolCallId, params) {
        const p = params as GoogleDriveParams;

        // Resolve credentials using context values
        const credentials = await resolveGoogleDriveCredentials({
          config: ctx.config,
          agentDir: ctx.agentDir,
        });

        if (!credentials) {
          return jsonResult({
            error:
              "No Google Drive credentials found. Please authenticate using 'openclaw models auth login --provider google-drive'",
          });
        }

        try {
          switch (p.action) {
            case "list": {
              const result = await listGoogleDriveFiles({
                credentials,
                folderId: p.folderId,
                query: p.query,
                maxResults: p.maxResults,
                pageToken: p.pageToken,
              });
              return jsonResult(result);
            }

            case "get": {
              const result = await getGoogleDriveFile({
                credentials,
                fileId: p.fileId,
              });
              return jsonResult(result);
            }

            case "download": {
              // Use workspaceDir from context if available, otherwise use current working directory
              const workspaceDir = ctx.workspaceDir || process.cwd();
              const result = await downloadGoogleDriveFile({
                credentials,
                fileId: p.fileId,
                exportFormat: p.exportFormat,
                outputPath: p.outputPath,
                workspaceDir,
              });
              return jsonResult({
                success: true,
                ...result,
                message: `Downloaded to ${result.path}`,
              });
            }

            case "read_docs": {
              const result = await readGoogleDocs({
                credentials,
                fileId: p.fileId,
                format: p.format === "text" ? "text" : "markdown",
              });
              return jsonResult({
                title: result.title,
                content: result.content,
                format: p.format || "markdown",
              });
            }

            default: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exhaustive check fallback
              return jsonResult({ error: `Unknown action: ${(p as any).action}` });
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          api.logger.error?.(`google_drive tool error: ${message}`);
          return jsonResult({ error: message });
        }
      },
    }),
    { optional: true },
  );

  api.logger.info?.("google_drive: Registered google_drive tool");
}
