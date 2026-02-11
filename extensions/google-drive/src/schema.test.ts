import { describe, it, expect } from "vitest";
import { GoogleDriveSchema } from "./schema.js";

describe("GoogleDriveSchema", () => {
  it("is a single object schema (no anyOf/oneOf) for provider compatibility", () => {
    expect(GoogleDriveSchema).toBeDefined();
    expect(GoogleDriveSchema.anyOf).toBeUndefined();
    expect(GoogleDriveSchema.oneOf).toBeUndefined();
    expect(GoogleDriveSchema.properties).toBeDefined();
  });

  it("has action as string enum with list, get, download, read_docs, read_sheets", () => {
    const action = (GoogleDriveSchema.properties as Record<string, { enum?: string[] }>).action;
    expect(action).toBeDefined();
    expect(action.enum).toEqual(["list", "get", "download", "read_docs", "read_sheets"]);
  });

  it("has optional fields for all actions", () => {
    const props = GoogleDriveSchema.properties as Record<string, unknown>;
    expect(props.folderId).toBeDefined();
    expect(props.query).toBeDefined();
    expect(props.fileId).toBeDefined();
    expect(props.spreadsheetId).toBeDefined();
    expect(props.range).toBeDefined();
    expect(props.exportFormat).toBeDefined();
    expect(props.format).toBeDefined();
  });
});
