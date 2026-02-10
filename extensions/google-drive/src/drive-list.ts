import type { drive_v3 } from "googleapis";
import { createGoogleDriveClient } from "./client.js";
// Dynamic type import for OAuthCredentials (not in plugin SDK)
type OAuthCredentials = import("../../src/agents/auth-profiles/types.js").OAuthCredentials;

export async function listGoogleDriveFiles(params: {
  credentials: OAuthCredentials;
  folderId?: string;
  query?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<{
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
    createdTime?: string;
    webViewLink?: string;
    webContentLink?: string;
    parents?: string[];
    isFolder: boolean;
  }>;
  nextPageToken?: string;
}> {
  const drive = createGoogleDriveClient(params.credentials);

  const request: drive_v3.Params$Resource$Files$List = {
    q: buildQuery(params.folderId, params.query),
    pageSize: params.maxResults || 100,
    fields:
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, parents)",
    orderBy: "modifiedTime desc",
  };

  if (params.pageToken) {
    request.pageToken = params.pageToken;
  }

  const response = await drive.files.list(request);

  if (!response.data.files) {
    return { files: [] };
  }

  return {
    files: response.data.files.map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType || "application/octet-stream",
      size: file.size,
      modifiedTime: file.modifiedTime || undefined,
      createdTime: file.createdTime || undefined,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      parents: file.parents || undefined,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
    })),
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

function buildQuery(folderId?: string, searchQuery?: string): string {
  const parts: string[] = [];

  // Folder filter
  if (folderId && folderId !== "root") {
    parts.push(`'${folderId}' in parents`);
  } else if (!folderId || folderId === "root") {
    parts.push(`'root' in parents`);
  }

  // Trash filter (exclude trashed files)
  parts.push("trashed = false");

  // Search query
  if (searchQuery) {
    parts.push(`(${searchQuery})`);
  }

  return parts.join(" and ");
}
