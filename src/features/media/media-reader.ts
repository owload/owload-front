import { IMAGE_HEADER_BYTES, extensionOf, locateHeicExif, mediaKind, parseHeicExifItem, parseImageHeader, parseMoov, readBoxHeader, type MediaMeta } from "./media-meta";

/** Reads `length` bytes from `offset` of one file (the offset counts from the start of the file; a read past its end gives what is there). */
export type ReadRange = (offset: number, length: number) => Promise<Uint8Array>;

const VIDEO_HEAD_BYTES = 64 * 1024;
/** A file's index is a few hundred kilobytes at most; a box claiming more is not read. */
const MAX_MOOV_BYTES = 32 * 1024 * 1024;
const MAX_BOX_HOPS = 24;

/**
 * Finds the `moov` box of an MP4 or a MOV and reads it. It is at the start of a file made for streaming and at the end of one that came
 * straight from a camera, behind the pictures: the boxes are walked by their headers, a few bytes each, so the pictures are never read.
 */
export async function readMoov(fileLength: number, read: ReadRange): Promise<Uint8Array | undefined> {
    const head = await read(0, Math.min(fileLength, VIDEO_HEAD_BYTES));
    const header = async (at: number): Promise<Uint8Array> => (at + 16 <= head.length ? head.subarray(at, at + 16) : read(at, Math.min(16, fileLength - at)));
    let position = 0;
    for (let hop = 0; hop < MAX_BOX_HOPS && position + 8 <= fileLength; hop++) {
        const box = readBoxHeader(await header(position), 0);
        if (!box) return undefined;
        const size = box.size === 0 ? fileLength - position : box.size;
        if (size < box.headerSize) return undefined;
        if (box.type === "moov") {
            if (size > MAX_MOOV_BYTES || position + size > fileLength) return undefined;
            return position + size <= head.length ? head.subarray(position, position + size) : read(position, size);
        }
        position += size;
    }
    return undefined;
}

/** What the file says about itself: when it was taken, how big it is, how long it is. Never rejects: a file that cannot be read says nothing. */
export async function readMediaMeta(fileName: string, fileLength: number, read: ReadRange): Promise<MediaMeta> {
    try {
        const kind = mediaKind(fileName);
        if (kind === "photo") {
            const head = await read(0, Math.min(fileLength, IMAGE_HEADER_BYTES));
            const meta = parseImageHeader(fileName, head);
            const heic = extensionOf(fileName) === "heic" || extensionOf(fileName) === "heif";
            if (heic && meta.takenAt === undefined) {
                // a phone keeps the EXIF of a HEIC where its table says, which may be behind the picture: that place is read
                const place = locateHeicExif(head);
                if (place && place.offset + 12 <= fileLength) {
                    const item = await read(place.offset, Math.min(place.length, 256 * 1024));
                    return { ...meta, ...parseHeicExifItem(item) };
                }
            }
            return meta;
        }
        if (kind === "video") {
            const moov = await readMoov(fileLength, read);
            return moov ? parseMoov(moov) : {};
        }
    } catch {
        // an unreadable file (a network failure, a damaged one) is one without a date; the caller decides whether to ask again
    }
    return {};
}

/** Like `readMediaMeta`, but says whether reading the file failed (as opposed to the file having nothing to tell), so that it can be tried again. */
export async function readMediaMetaChecked(fileName: string, fileLength: number, read: ReadRange): Promise<{ meta: MediaMeta; failed: boolean }> {
    let failed = false;
    const guarded: ReadRange = async (offset, length) => {
        try {
            return await read(offset, length);
        } catch (error) {
            failed = true;
            throw error;
        }
    };
    const meta = await readMediaMeta(fileName, fileLength, guarded);
    return { meta, failed };
}
