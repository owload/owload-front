import { PhotoCache } from "@/lib/photo-cache";
import type { DriveClient } from "@/engine";
import { registry } from "@/extensions/registry";
import { requestPreview } from "@/extensions/preview";
import { isExtensionPhoto } from "@/components/media-preview/extension-photo";
import type { MediaItem } from "./media-library";

/** At most this many small pictures are fetched and decrypted at once: scrolling quickly asks for hundreds. */
const CONCURRENCY = 6;
/** The addresses of the pictures kept: enough for a few screens, the oldest are released. */
const KEPT = 600;

const cache = new PhotoCache(KEPT, (url) => URL.revokeObjectURL(url));
let running = 0;
const waiting: Array<() => void> = [];

async function takeSlot(): Promise<void> {
    if (running < CONCURRENCY) { running++; return; }
    await new Promise<void>((resolve) => waiting.push(resolve));
}

function giveSlot(): void {
    const next = waiting.shift();
    if (next) next();
    else running--;
}

/** A tile that has been scrolled past before its turn comes is dropped from the queue; asking again later fetches it. */
export class NotWantedAnymore extends Error {}

function imageType(bytes: Uint8Array): string {
    if (bytes.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
    return "";
}

/** A tile wider or taller than this many pixels is shown with the larger picture (about 1024 pixels), where the drive has one, so that it is not blurred. */
const LARGE_TILE = 380;

/** The address of the picture of a media file for a tile of this size, or undefined when the drive has none for it. */
export function loadThumbnail(driveClient: DriveClient, item: MediaItem, stillWanted: () => boolean, tileWidth = 0, tileHeight = 0): Promise<string | undefined> {
    const large = (tileWidth > LARGE_TILE || tileHeight > LARGE_TILE) && item.preview !== undefined;
    const thumbnail = large ? item.preview : item.thumbnail;
    if (!thumbnail) return decodeThumbnail(driveClient, item, stillWanted, tileWidth > LARGE_TILE || tileHeight > LARGE_TILE ? 720 : 360);
    return cache.get(`${item.id}:${large ? "large" : "small"}`, async () => {
        await takeSlot();
        try {
            if (!stillWanted()) throw new NotWantedAnymore();
            const bytes = await driveClient.getFileData(thumbnail.byteOffset, thumbnail.byteLength, "", true);
            return URL.createObjectURL(new Blob([bytes], { type: imageType(bytes) }));
        } finally {
            giveSlot();
        }
    });
}

/** Decoding a photo takes a worker and a few seconds of the processor: two at a time, apart from the fetching of the small pictures. */
const DECODE_CONCURRENCY = 2;
const DECODE_TIMEOUT_MS = 60_000;
/** The usual limit of a stored thumbnail is small; a 720-pixel PNG is more. */
const DECODED_MAX_BYTES = 4 * 1024 * 1024;
let decoding = 0;
const decodeWaiting: Array<() => void> = [];

async function takeDecodeSlot(): Promise<void> {
    if (decoding < DECODE_CONCURRENCY) { decoding++; return; }
    await new Promise<void>((resolve) => decodeWaiting.push(resolve));
}

function giveDecodeSlot(): void {
    const next = decodeWaiting.shift();
    if (next) next();
    else decoding--;
}

/** A photo the browser cannot draw (HEIC) and that has no small picture in the drive (uploaded before there were any, or while no extension could make one) is decoded here, from the file itself. */
function decodeThumbnail(driveClient: DriveClient, item: MediaItem, stillWanted: () => boolean, size: number): Promise<string | undefined> {
    if (item.kind !== "photo" || !isExtensionPhoto(item.name) || item.file.finished === false) return Promise.resolve(undefined);
    const entry = registry.forFileName(item.name);
    if (!entry?.extension.preview) return Promise.resolve(undefined);
    return cache.get(`${item.id}:decoded:${size}`, async () => {
        await takeDecodeSlot();
        try {
            if (!stillWanted()) throw new NotWantedAnymore();
            const data = await driveClient.getFileData(item.file.byteOffset, item.file.byteLength, "", false);
            if (!stillWanted()) throw new NotWantedAnymore();
            const png = await requestPreview(entry.extension, data, { size, timeoutMs: DECODE_TIMEOUT_MS, maxBytes: DECODED_MAX_BYTES });
            if (!png) throw new Error("The photo could not be decoded");
            return URL.createObjectURL(new Blob([png as Uint8Array<ArrayBuffer>], { type: "image/png" }));
        } finally {
            giveDecodeSlot();
        }
    });
}

/** The pictures kept are released when the media section is left. */
export function clearThumbnails(): void {
    cache.clear();
}
