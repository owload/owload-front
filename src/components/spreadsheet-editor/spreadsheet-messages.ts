export const SPREADSHEET_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Shown while a file is open, until the user dismisses it or saves (epic 0023, task 0004). */
export const LOSSY_SAVE_NOTICE =
  "This editor does not support every spreadsheet feature. Charts, images, comments, conditional formatting, " +
  "frozen panes and similar content are dropped when you save. The previous version stays in the file's history.";

const FORBIDDEN_NAME_CHARS = /[/\\]/;

/**
 * The file name for a new spreadsheet, with the .xlsx extension added if
 * missing; or an error text. `existingNames` are the names in the current folder.
 */
export function newSpreadsheetFileName(
  input: string,
  existingNames: string[],
): { name: string; error?: undefined } | { name?: undefined; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Enter a name." };
  if (FORBIDDEN_NAME_CHARS.test(trimmed)) return { error: "The name cannot contain / or \\." };
  const name = trimmed.toLowerCase().endsWith(".xlsx") ? trimmed : trimmed + ".xlsx";
  if (name.toLowerCase() === ".xlsx") return { error: "Enter a name." };
  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    return { error: "A file with this name already exists in this folder." };
  }
  return { name };
}
