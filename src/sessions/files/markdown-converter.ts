import csvToMarkdown from "csv-to-markdown-table";

export function csvToMarkdownTable(csv: string): string {
  if (!csv.trim()) {
    return "";
  }

  // Use csv-to-markdown-table library
  // Parameters: csvString, delimiter (default ','), hasHeaders (default true)
  const result = csvToMarkdown(csv, ",", true);
  // Trim trailing whitespace and newlines
  return result.trimEnd();
}
