import { Type, type Static } from "@sinclair/typebox";

export const GoogleDriveListSchema = Type.Object({
  action: Type.Literal("list"),
  folderId: Type.Optional(
    Type.String({
      description: "Folder ID to list (omit for root directory). Use 'root' for root folder.",
    }),
  ),
  query: Type.Optional(
    Type.String({
      description: "Search query to filter files (e.g., 'name contains \"report\"').",
    }),
  ),
  maxResults: Type.Optional(
    Type.Number({
      description: "Maximum number of results to return (default: 100, max: 1000).",
      minimum: 1,
      maximum: 1000,
      default: 100,
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description: "Page token for pagination (from previous list response).",
    }),
  ),
});

export const GoogleDriveGetSchema = Type.Object({
  action: Type.Literal("get"),
  fileId: Type.String({
    description: "File ID to get metadata for.",
  }),
});

export const GoogleDriveDownloadSchema = Type.Object({
  action: Type.Literal("download"),
  fileId: Type.String({
    description: "File ID to download.",
  }),
  exportFormat: Type.Optional(
    Type.String({
      description:
        "Export format for Google Workspace files. Options: 'pdf', 'docx', 'txt', 'html', 'rtf', 'odt', 'xlsx', 'csv', 'tsv', 'pptx', 'png', 'jpg', 'svg'. Omit for original format.",
    }),
  ),
  outputPath: Type.Optional(
    Type.String({
      description:
        "Optional output path (relative to workspace). If omitted, file will be saved with original name.",
    }),
  ),
});

export const GoogleDocsReadSchema = Type.Object({
  action: Type.Literal("read_docs"),
  fileId: Type.String({
    description: "Google Docs file ID to read.",
  }),
  format: Type.Optional(
    Type.String({
      description: "Output format: 'markdown' (default) or 'text'.",
      default: "markdown",
    }),
  ),
});

export const GoogleDriveSchema = Type.Union([
  GoogleDriveListSchema,
  GoogleDriveGetSchema,
  GoogleDriveDownloadSchema,
  GoogleDocsReadSchema,
]);

export type GoogleDriveParams = Static<typeof GoogleDriveSchema>;
