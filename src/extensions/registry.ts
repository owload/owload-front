import { extension as heic } from "@owload/heic-viewer/extension";
import { extension as text } from "@owload/text-editor/extension";
import { extension as xlsx } from "@owload/xlsx-editor/extension";
import { buildRegistry } from "./registry-core";

/**
 * The editor extensions of the client: an explicit list of the packages that are dependencies of
 * owload-front, pinned to exact versions (owload-docs/decisions/0019). There is no discovery and no
 * installation at run time. To add a format: add the dependency, then one entry here.
 *
 * The descriptors are tiny and loaded eagerly; the editors and their styles are loaded when a file of
 * that type is opened.
 */
export const registry = buildRegistry([
  { extension: heic, loadStyles: () => import("@owload/heic-viewer/style.css") },
  { extension: text, loadStyles: () => import("@owload/text-editor/style.css") },
  { extension: xlsx, loadStyles: () => import("@owload/xlsx-editor/style.css") },
]);
