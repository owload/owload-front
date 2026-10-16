import { PhotoCache } from "@/lib/photo-cache";
import type { DriveClient } from "@/engine";
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

/** The address of the small picture of a media file, or undefined when the drive has none for it. */
export function loadThumbnail(driveClient: DriveClient, item: MediaItem, stillWanted: () => boolean): Promise<string | undefined> {
    const thumbnail = item.thumbnail;
    if (!thumbnail) return Promise.resolve(undefined);
    return cache.get(item.id, async () => {
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

/** The pictures kept are released when the media section is left. */
export function clearThumbnails(): void {
    cache.clear();
}
