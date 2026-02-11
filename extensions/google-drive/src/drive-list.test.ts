import { describe, it, expect } from "vitest";
import { buildQuery } from "./drive-list.js";

describe("buildQuery", () => {
  it("defaults to root folder and excludes trashed", () => {
    expect(buildQuery()).toBe("'root' in parents and trashed = false");
    expect(buildQuery(undefined, undefined)).toBe("'root' in parents and trashed = false");
  });

  it("uses 'root' when folderId is 'root'", () => {
    expect(buildQuery("root")).toBe("'root' in parents and trashed = false");
  });

  it("uses folder id when provided and not 'root'", () => {
    expect(buildQuery("abc123")).toBe("'abc123' in parents and trashed = false");
  });

  it("appends search query when provided", () => {
    expect(buildQuery("root", "name contains 'report'")).toBe(
      "'root' in parents and trashed = false and (name contains 'report')",
    );
  });

  it("combines custom folder and query", () => {
    expect(buildQuery("folderId1", "mimeType = 'application/pdf'")).toBe(
      "'folderId1' in parents and trashed = false and (mimeType = 'application/pdf')",
    );
  });

  it("uses parent clause from query when folderId is root/empty (avoids root AND folder)", () => {
    expect(buildQuery(undefined, "'1MeTF_c' in parents")).toBe(
      "'1MeTF_c' in parents and trashed = false",
    );
    expect(buildQuery("root", "'sharedFolderId' in parents and trashed = false")).toBe(
      "'sharedFolderId' in parents and trashed = false",
    );
  });
});
