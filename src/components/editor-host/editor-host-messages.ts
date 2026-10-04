import { DEFAULT_MAX_FILE_BYTES, type EditorExtension } from "@owload/editor-sdk";
import { fileExtensionOf } from "@/extensions/registry-core";

/** Wording and small pure helpers of the editor host, kept apart so they can be tested in Node. */

export function maxFileBytes(extension: EditorExtension): number {
  return extension.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
}

const MIB = 1024 * 1024;
const mib = (bytes: number) => `${Math.max(1, Math.round(bytes / MIB))} MB`;

/** The message for a file over the extension's limit; null if the size is fine. */
export function tooLargeMessage(extension: EditorExtension, byteLength: number): string | null {
  const limit = maxFileBytes(extension);
  if (byteLength <= limit) return null;
  return `This file is too large to open here (${mib(byteLength)}; the ${extension.label.toLowerCase()} editor opens files up to ${mib(limit)}).`;
}

/**
 * The file name for a new document, with the extension's default file extension added when the
 * name does not end in one of its extensions; or an error text. `existingNames` are the names in
 * the current folder: the first Save is a REPLACE and would otherwise overwrite that file.
 */
export function newFileName(
  input: string,
  extension: EditorExtension,
  existingNames: string[],
): { name: string; error?: undefined } | { name?: undefined; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Enter a name." };
  if (/[/\\]/.test(trimmed)) return { error: "The name cannot contain / or \\." };
  const has = extension.fileExtensions.includes(fileExtensionOf(trimmed));
  const name = has ? trimmed : `${trimmed}.${extension.createNew?.defaultExtension ?? extension.fileExtensions[0]}`;
  if (name.startsWith(".") && fileExtensionOf(name) === name.slice(1)) return { error: "Enter a name." };
  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    return { error: "A file with this name already exists in this folder." };
  }
  return { name };
}
