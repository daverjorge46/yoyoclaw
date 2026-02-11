import { createGoogleSheetsClient } from "./client.js";
// Dynamic type import for OAuthCredentials (not in plugin SDK)
type OAuthCredentials = import("../../../src/agents/auth-profiles/types.js").OAuthCredentials;

export async function readGoogleSheetsRange(params: {
  credentials: OAuthCredentials;
  spreadsheetId: string;
  range: string;
}): Promise<{
  range: string;
  values: unknown[][];
  majorDimension: string;
}> {
  const sheets = createGoogleSheetsClient(params.credentials);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: params.spreadsheetId,
    range: params.range,
    majorDimension: "ROWS",
  });

  const values = (response.data.values ?? []) as unknown[][];
  const range = response.data.range ?? params.range;
  const majorDimension = response.data.majorDimension ?? "ROWS";

  return {
    range,
    values,
    majorDimension,
  };
}
