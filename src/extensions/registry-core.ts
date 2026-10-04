import { ExtensionError, validateExtension, type EditorExtension } from "@owload/editor-sdk";

/**
 * The editor extensions the client knows (owload-docs/decisions/0019). Kept free of the
 * browser and of the real packages so it can be unit-tested in Node; the list itself is in registry.ts.
 */

export interface ExtensionEntry {
  extension: EditorExtension;
  /** Loads the extension's stylesheet; imported lazily together with the editor. */
  loadStyles?: () => Promise<unknown>;
}

export interface Registry {
  all(): ExtensionEntry[];
  byId(id: string): ExtensionEntry | undefined;
  /** The extension that opens a file of this name, by its extension (case-insensitive). */
  forFileName(fileName: string): ExtensionEntry | undefined;
  /** Every file extension some editor opens (lower case, no dot). */
  fileExtensions(): string[];
  /** The extensions that offer "New <label>". */
  creatable(): ExtensionEntry[];
}

export function fileExtensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Validates the entries (a bad one stops the start-up with a message naming it) and indexes them. */
export function buildRegistry(entries: ExtensionEntry[]): Registry {
  const byId = new Map<string, ExtensionEntry>();
  const byFileExtension = new Map<string, ExtensionEntry>();

  for (const entry of entries) {
    const problems = validateExtension(entry.extension);
    if (problems.length > 0) {
      const id = typeof entry.extension?.id === "string" ? entry.extension.id : "(unknown)";
      throw new ExtensionError(`Invalid editor extension "${id}": ${problems.join(" ")}`);
    }
    const { id, fileExtensions } = entry.extension;
    if (byId.has(id)) throw new ExtensionError(`Two editor extensions have the id "${id}".`);
    byId.set(id, entry);
    for (const ext of fileExtensions) {
      const other = byFileExtension.get(ext);
      if (other) throw new ExtensionError(`".${ext}" is claimed by both "${other.extension.id}" and "${id}".`);
      byFileExtension.set(ext, entry);
    }
  }

  return {
    all: () => [...entries],
    byId: (id) => byId.get(id),
    forFileName: (fileName) => byFileExtension.get(fileExtensionOf(fileName)),
    fileExtensions: () => [...byFileExtension.keys()],
    creatable: () => entries.filter((e) => e.extension.createNew !== undefined),
  };
}
