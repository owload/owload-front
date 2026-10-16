import { registry } from "@/extensions/registry";
import { requestPreview } from "@/extensions/preview";
import { PhotoCache } from "@/lib/photo-cache";

/** The photos that an extension decodes (the browser cannot): they are shown in the media preview, as a picture, so that they page like any other. */
export const extensionPhotoExtensions: string[] = ["heic", "heif"];

export function isExtensionPhoto(fileName: string): boolean {
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    return fileName.includes(".") && extensionPhotoExtensions.includes(extension);
}

const MIN_SIZE = 1280;
const MAX_SIZE = 3072;
/** A picture of this size as a PNG can be tens of megabytes; the usual limit of a thumbnail is far too small for it. */
const MAX_PHOTO_BYTES = 64 * 1024 * 1024;
const DECODE_TIMEOUT_MS = 60_000;

/** How many pixels on the longer side a photo needs on this screen: what fills it, between a reasonable least and a most that keeps memory down. */
export function photoSizeForScreen(screenLongSide: number, pixelRatio: number): number {
    const wanted = Math.ceil(screenLongSide * Math.max(1, pixelRatio));
    return Math.min(MAX_SIZE, Math.max(MIN_SIZE, wanted));
}

function screenSize(): number {
    return photoSizeForScreen(Math.max(window.screen?.width ?? 0, window.screen?.height ?? 0), window.devicePixelRatio || 1);
}

const cache = new PhotoCache(4, (url) => URL.revokeObjectURL(url));

/**
 * The address of the picture of a photo the extension decodes: the file is decoded in the extension's worker and drawn at the size of
 * the screen. Quick for a photo that was just seen; rejects when the photo cannot be decoded (a damaged file, no canvas).
 */
export function loadExtensionPhoto(fileId: string, fileName: string, readFile: () => Promise<Uint8Array>): Promise<string> {
    return cache.get(fileId, async () => {
        const entry = registry.forFileName(fileName);
        if (!entry) throw new Error("No extension for this file");
        const data = await readFile();
        const size = screenSize();
        const png = await requestPreview(entry.extension, data, { size, timeoutMs: DECODE_TIMEOUT_MS, maxBytes: MAX_PHOTO_BYTES });
        if (!png) throw new Error("The photo could not be decoded");
        return URL.createObjectURL(new Blob([png as Uint8Array<ArrayBuffer>], { type: "image/png" }));
    });
}

/** Starts decoding a photo that will probably be asked for next; whatever goes wrong is ignored (it will be asked for properly later). */
export function prefetchExtensionPhoto(fileId: string, fileName: string, readFile: () => Promise<Uint8Array>): void {
    if (cache.has(fileId)) return;
    void loadExtensionPhoto(fileId, fileName, readFile).catch(() => undefined);
}
