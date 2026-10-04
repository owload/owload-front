import { MAX_PREVIEW_BYTES, PREVIEW_TIMEOUT_MS, THUMBNAIL_SIZE, validatePreview, type EditorExtension } from "@owload/editor-sdk";
import { maxFileBytes } from "@/components/editor-host/editor-host-messages";

/**
 * Asks an editor extension for the PNG preview of a file (owload-docs/decisions/0020). The host does
 * not trust the extension: it checks the size of the source, passes it a copy, gives up after a time
 * limit and accepts the result only if it is a valid PNG within the requested size. Whatever goes wrong,
 * the answer is "no preview" - a preview never fails an upload or a save.
 */

export interface PreviewLimits {
    size?: number;
    timeoutMs?: number;
    maxBytes?: number;
}

export async function requestPreview(
    extension: EditorExtension,
    data: Uint8Array,
    { size = THUMBNAIL_SIZE, timeoutMs = PREVIEW_TIMEOUT_MS, maxBytes = MAX_PREVIEW_BYTES }: PreviewLimits = {},
): Promise<Uint8Array | null> {
    if (!extension.preview || data.byteLength === 0 || data.byteLength > maxFileBytes(extension)) return null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const timeout = new Promise<"timeout">((resolve) => { timer = setTimeout(() => resolve("timeout"), timeoutMs); });
        // A copy, so an extension that changes its input cannot touch the bytes the editor still uses.
        const outcome = await Promise.race([extension.preview(new Uint8Array(data), { size }), timeout]);
        if (outcome === "timeout") {
            console.warn(`The preview of a "${extension.id}" file took more than ${timeoutMs} ms and was skipped.`);
            return null;
        }
        if (outcome === null) return null;
        const problems = validatePreview(outcome, size, maxBytes);
        if (problems.length > 0) {
            console.warn(`The "${extension.id}" preview was rejected: ${problems.join(" ")}`);
            return null;
        }
        return outcome;
    } catch (e) {
        // Only the kind of error: its message may contain pieces of the document.
        console.warn(`The preview of a "${extension.id}" file failed (${e instanceof Error ? e.name : "error"}).`);
        return null;
    } finally {
        clearTimeout(timer);
    }
}
