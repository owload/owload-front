/**
 * What the media section needs to know about a photo or a video, read from the first bytes of the file: when it was taken, how big it is
 * (with its rotation applied), and for a video how long it is. Pure functions on bytes; nothing here touches the drive.
 *
 * The bytes are untrusted input: every read is bounds-checked, and a file that does not fit what is expected gives no information,
 * never an error.
 */

export interface MediaMeta {
    /** When it was taken, in milliseconds; absent when the file does not say. */
    takenAt?: number;
    /** Width and height as shown (rotation applied). */
    width?: number;
    height?: number;
    /** Length of a video in seconds. */
    duration?: number;
}

const MS_FROM_1904_TO_1970 = 2082844800 * 1000;

/** The bytes at the start of a file are enough for these; a video's index may be at the end, see `findMoov`. */
export const IMAGE_HEADER_BYTES = 192 * 1024;

export function extensionOf(fileName: string): string {
    const dot = fileName.lastIndexOf(".");
    return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export const photoExtensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tiff", "svg"];
export const videoExtensions = ["mp4", "mov"];

export function mediaKind(fileName: string): "photo" | "video" | undefined {
    const extension = extensionOf(fileName);
    if (photoExtensions.includes(extension)) return "photo";
    if (videoExtensions.includes(extension)) return "video";
    return undefined;
}

// ---------------------------------------------------------------------------------------------------------------------
// bytes

function view(bytes: Uint8Array): DataView {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
    if (start < 0 || start + length > bytes.length) return "";
    let text = "";
    for (let i = 0; i < length; i++) text += String.fromCharCode(bytes[start + i]);
    return text;
}

function indexOfBytes(bytes: Uint8Array, pattern: number[], from = 0, to = bytes.length): number {
    const last = Math.min(to, bytes.length) - pattern.length;
    outer: for (let i = Math.max(0, from); i <= last; i++) {
        for (let j = 0; j < pattern.length; j++) if (bytes[i + j] !== pattern[j]) continue outer;
        return i;
    }
    return -1;
}

const textBytes = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

function swapsSides(orientation: number | undefined): boolean {
    return orientation !== undefined && orientation >= 5 && orientation <= 8;
}

function oriented(width: number | undefined, height: number | undefined, swap: boolean): { width?: number; height?: number } {
    if (!width || !height) return {};
    return swap ? { width: height, height: width } : { width, height };
}

// ---------------------------------------------------------------------------------------------------------------------
// EXIF (a TIFF structure: in a JPEG, a PNG, a WebP and a HEIC alike)

interface Exif {
    takenAt?: number;
    orientation?: number;
    width?: number;
    height?: number;
}

const TAG_ORIENTATION = 0x0112;
const TAG_DATE_TIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;
const TAG_OFFSET_TIME_ORIGINAL = 0x9011;
const TAG_OFFSET_TIME = 0x9010;
const TAG_PIXEL_X = 0xa002;
const TAG_PIXEL_Y = 0xa003;

/** "2024:03:09 14:05:33" is a time on the camera's clock; with an offset ("+03:00") it is an exact moment, without it the viewer's own zone. */
export function parseExifDate(text: string, offset?: string): number | undefined {
    const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(text);
    if (!match) return undefined;
    const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 60) return undefined;
    const zone = offset ? /^([+-])(\d{2}):(\d{2})/.exec(offset) : null;
    if (zone) {
        const minutes = (Number(zone[2]) * 60 + Number(zone[3])) * (zone[1] === "-" ? -1 : 1);
        return Date.UTC(year, month - 1, day, hour, minute, second) - minutes * 60_000;
    }
    return new Date(year, month - 1, day, hour, minute, second).getTime();
}

/** Reads the TIFF structure that starts at `start` (the byte order mark). */
export function parseTiff(bytes: Uint8Array, start: number): Exif {
    if (start < 0 || start + 8 > bytes.length) return {};
    const order = ascii(bytes, start, 2);
    if (order !== "II" && order !== "MM") return {};
    const little = order === "II";
    const data = view(bytes);
    if (data.getUint16(start + 2, little) !== 42) return {};

    const u16 = (at: number) => (at >= 0 && at + 2 <= bytes.length ? data.getUint16(at, little) : undefined);
    const u32 = (at: number) => (at >= 0 && at + 4 <= bytes.length ? data.getUint32(at, little) : undefined);

    interface Entry { tag: number; type: number; count: number; at: number }
    const entries = (ifdOffset: number | undefined): Entry[] => {
        if (ifdOffset === undefined) return [];
        const base = start + ifdOffset;
        const count = u16(base);
        if (count === undefined || count > 512) return [];
        const result: Entry[] = [];
        for (let i = 0; i < count; i++) {
            const at = base + 2 + i * 12;
            const tag = u16(at);
            const type = u16(at + 2);
            const length = u32(at + 4);
            if (tag === undefined || type === undefined || length === undefined) break;
            result.push({ tag, type, count: length, at: at + 8 });
        }
        return result;
    };
    const text = (entry: Entry): string | undefined => {
        if (entry.type !== 2 || entry.count < 1 || entry.count > 64) return undefined;
        const where = entry.count <= 4 ? entry.at : (u32(entry.at) ?? -1) + start;
        const value = ascii(bytes, where, entry.count);
        return value ? value.replace(/\0.*$/s, "") : undefined;
    };
    const number = (entry: Entry): number | undefined => (entry.type === 3 ? u16(entry.at) : entry.type === 4 ? u32(entry.at) : undefined);

    const ifd0 = entries(u32(start + 4));
    const result: Exif = {};
    const changeEntry = ifd0.find((e) => e.tag === TAG_DATE_TIME);
    const changed = changeEntry ? text(changeEntry) : undefined;
    const orientation = ifd0.find((e) => e.tag === TAG_ORIENTATION);
    if (orientation) result.orientation = number(orientation);

    const exifPointer = ifd0.find((e) => e.tag === TAG_EXIF_IFD);
    const exif = entries(exifPointer ? u32(exifPointer.at) : undefined);
    const original = exif.find((e) => e.tag === TAG_DATE_TIME_ORIGINAL);
    const digitized = exif.find((e) => e.tag === TAG_DATE_TIME_DIGITIZED);
    const offsetEntry = exif.find((e) => e.tag === TAG_OFFSET_TIME_ORIGINAL) ?? exif.find((e) => e.tag === TAG_OFFSET_TIME);
    const exactDate = (original && text(original)) || (digitized && text(digitized)) || undefined;
    if (exactDate) result.takenAt = parseExifDate(exactDate, offsetEntry ? text(offsetEntry) : undefined);
    else if (changed) result.takenAt = parseExifDate(changed); // the date of the last change of the file: the least that can be said

    const x = exif.find((e) => e.tag === TAG_PIXEL_X);
    const y = exif.find((e) => e.tag === TAG_PIXEL_Y);
    if (x && y) {
        result.width = number(x);
        result.height = number(y);
    }
    return result;
}

// ---------------------------------------------------------------------------------------------------------------------
// JPEG

export function parseJpeg(bytes: Uint8Array): MediaMeta {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return {};
    const data = view(bytes);
    let exif: Exif = {};
    let width: number | undefined;
    let height: number | undefined;
    let position = 2;
    while (position + 4 <= bytes.length) {
        if (bytes[position] !== 0xff) break;
        const marker = bytes[position + 1];
        if (marker === 0xff) { position++; continue; }
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { position += 2; continue; }
        if (marker === 0xd9 || marker === 0xda) break; // the end, or the start of the picture itself
        const length = data.getUint16(position + 2, false);
        if (length < 2) break;
        if (marker === 0xe1 && ascii(bytes, position + 4, 6) === "Exif\0\0" && exif.takenAt === undefined) {
            exif = parseTiff(bytes, position + 10);
        } else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            if (position + 9 <= bytes.length) {
                height = data.getUint16(position + 5, false);
                width = data.getUint16(position + 7, false);
            }
            break;
        }
        position += 2 + length;
    }
    const size = oriented(width || exif.width, height || exif.height, swapsSides(exif.orientation));
    return { takenAt: exif.takenAt, ...size };
}

// ---------------------------------------------------------------------------------------------------------------------
// PNG, WebP, GIF

export function parsePng(bytes: Uint8Array): MediaMeta {
    if (bytes.length < 24 || ascii(bytes, 1, 3) !== "PNG") return {};
    const data = view(bytes);
    const width = data.getUint32(16, false);
    const height = data.getUint32(20, false);
    let exif: Exif = {};
    let position = 8;
    while (position + 12 <= bytes.length) {
        const length = data.getUint32(position, false);
        const type = ascii(bytes, position + 4, 4);
        if (type === "eXIf") { exif = parseTiff(bytes, position + 8); break; }
        if (type === "IDAT" || type === "IEND") break;
        position += 12 + length;
    }
    return { takenAt: exif.takenAt, ...oriented(width, height, swapsSides(exif.orientation)) };
}

export function parseWebp(bytes: Uint8Array): MediaMeta {
    if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return {};
    const data = view(bytes);
    const kind = ascii(bytes, 12, 4);
    let width: number | undefined;
    let height: number | undefined;
    if (kind === "VP8X") {
        width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
        height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    } else if (kind === "VP8L" && bytes[20] === 0x2f) {
        const bits = data.getUint32(21, true);
        width = 1 + (bits & 0x3fff);
        height = 1 + ((bits >>> 14) & 0x3fff);
    } else if (kind === "VP8 ") {
        width = data.getUint16(26, true) & 0x3fff;
        height = data.getUint16(28, true) & 0x3fff;
    }
    let exif: Exif = {};
    let position = 12;
    while (position + 8 <= bytes.length) {
        const chunk = ascii(bytes, position, 4);
        const length = data.getUint32(position + 4, true);
        if (chunk === "EXIF") {
            const body = position + 8;
            exif = parseTiff(bytes, ascii(bytes, body, 6) === "Exif\0\0" ? body + 6 : body);
            break;
        }
        position += 8 + length + (length % 2);
    }
    return { takenAt: exif.takenAt, ...oriented(width, height, swapsSides(exif.orientation)) };
}

export function parseGif(bytes: Uint8Array): MediaMeta {
    if (bytes.length < 10 || ascii(bytes, 0, 3) !== "GIF") return {};
    const data = view(bytes);
    return oriented(data.getUint16(6, true), data.getUint16(8, true), false);
}

// ---------------------------------------------------------------------------------------------------------------------
// HEIC / HEIF (an ISO box file: the size is in the `ispe` box, the turn in `irot`, the EXIF is an item of the file)

export function parseHeic(bytes: Uint8Array): MediaMeta {
    if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return {};
    const data = view(bytes);

    // the largest picture the file declares is the photo (the others are its thumbnails and tiles)
    let width = 0;
    let height = 0;
    let from = 0;
    for (;;) {
        const at = indexOfBytes(bytes, textBytes("ispe"), from);
        if (at < 0 || at + 16 > bytes.length) break;
        const w = data.getUint32(at + 8, false);
        const h = data.getUint32(at + 12, false);
        if (w * h > width * height && w < 100_000 && h < 100_000) { width = w; height = h; }
        from = at + 4;
    }
    let turns = 0;
    const rotation = indexOfBytes(bytes, textBytes("irot"));
    if (rotation >= 0 && rotation + 5 <= bytes.length) turns = bytes[rotation + 4] & 3;

    // the EXIF item: four bytes with the offset of the TIFF header, then (usually) "Exif\0\0" and the TIFF structure
    let exif: Exif = {};
    let search = 0;
    for (let tries = 0; tries < 8 && exif.takenAt === undefined; tries++) {
        const marker = indexOfBytes(bytes, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00], search);
        if (marker < 0) break;
        exif = parseTiff(bytes, marker + 6);
        search = marker + 6;
    }
    return { takenAt: exif.takenAt, ...oriented(width, height, turns % 2 === 1) };
}

/**
 * Where the EXIF block of a HEIC file is, from its table of items (`iinf` names the items, `iloc` says where each one is). A phone's file
 * may keep it far from the start, behind the picture, so looking for it in the first bytes is not enough. Gives the offset and the length
 * in the file, or undefined when the table is not there or does not say.
 */
export function locateHeicExif(bytes: Uint8Array): { offset: number; length: number } | undefined {
    if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return undefined;
    const data = view(bytes);
    const meta = findChild(bytes, 0, bytes.length, "meta");
    if (!meta) return undefined;
    const children = meta.start + meta.headerSize + 4; // the box is a "full box": a version and flags come first
    const end = Math.min(bytes.length, meta.size ? meta.start + meta.size : bytes.length);

    // the number of the item whose type is "Exif"
    const iinf = findChild(bytes, children, end, "iinf");
    if (!iinf) return undefined;
    const iinfVersion = bytes[iinf.start + iinf.headerSize];
    let at = iinf.start + iinf.headerSize + 4 + (iinfVersion === 0 ? 2 : 4);
    let exifItem: number | undefined;
    const iinfEnd = Math.min(bytes.length, iinf.start + iinf.size);
    while (at + 8 <= iinfEnd && exifItem === undefined) {
        const infe = readBoxHeader(bytes, at);
        if (!infe || infe.size < infe.headerSize || infe.type !== "infe") break;
        const body = infe.start + infe.headerSize;
        const version = bytes[body];
        if (version >= 2 && body + 12 <= bytes.length) {
            const wide = version >= 3;
            const id = wide ? data.getUint32(body + 4, false) : data.getUint16(body + 4, false);
            const typeAt = body + 4 + (wide ? 4 : 2) + 2;
            if (ascii(bytes, typeAt, 4) === "Exif") exifItem = id;
        }
        at += infe.size;
    }
    if (exifItem === undefined) return undefined;

    // where that item's bytes are
    const iloc = findChild(bytes, children, end, "iloc");
    if (!iloc) return undefined;
    let p = iloc.start + iloc.headerSize;
    const version = bytes[p];
    p += 4;
    if (p + 4 > bytes.length) return undefined;
    const offsetSize = bytes[p] >> 4;
    const lengthSize = bytes[p] & 15;
    const baseOffsetSize = bytes[p + 1] >> 4;
    const indexSize = version === 1 || version === 2 ? bytes[p + 1] & 15 : 0;
    p += 2;
    const read = (size: number): number | undefined => {
        if (p + size > bytes.length || size > 8) return undefined;
        let value = 0;
        for (let i = 0; i < size; i++) value = value * 256 + bytes[p + i];
        p += size;
        return value;
    };
    const count = version < 2 ? read(2) : read(4);
    if (count === undefined || count > 100_000) return undefined;
    for (let i = 0; i < count; i++) {
        const id = version < 2 ? read(2) : read(4);
        if (id === undefined) return undefined;
        let method = 0;
        if (version === 1 || version === 2) method = (read(2) ?? 0) & 15;
        read(2); // the data reference
        const base = read(baseOffsetSize) ?? 0;
        const extents = read(2);
        if (extents === undefined) return undefined;
        for (let e = 0; e < extents; e++) {
            if (indexSize > 0) read(indexSize);
            const offset = read(offsetSize);
            const length = read(lengthSize);
            if (offset === undefined || length === undefined) return undefined;
            if (id === exifItem && e === 0) return method === 0 && length > 8 ? { offset: base + offset, length } : undefined;
        }
    }
    return undefined;
}

/** The TIFF structure inside the bytes of a HEIC's EXIF item: four bytes with the distance to it, then (usually) "Exif\0\0", then the TIFF header. */
export function parseHeicExifItem(item: Uint8Array): MediaMeta {
    if (item.length < 12) return {};
    const skip = view(item).getUint32(0, false);
    if (skip > item.length - 8) return {};
    const exif = parseTiff(item, 4 + skip);
    return { takenAt: exif.takenAt };
}

// ---------------------------------------------------------------------------------------------------------------------
// MP4 / MOV

interface Box { type: string; start: number; headerSize: number; size: number }

/** The box that starts at `at`, or undefined when the bytes do not hold a whole header. `size` is 0 when the box runs to the end of the file. */
export function readBoxHeader(bytes: Uint8Array, at: number): Box | undefined {
    if (at < 0 || at + 8 > bytes.length) return undefined;
    const data = view(bytes);
    let size = data.getUint32(at, false);
    const type = ascii(bytes, at + 4, 4);
    let headerSize = 8;
    if (size === 1) {
        if (at + 16 > bytes.length) return undefined;
        const high = data.getUint32(at + 8, false);
        const low = data.getUint32(at + 12, false);
        size = high * 2 ** 32 + low;
        headerSize = 16;
    }
    return { type, start: at, headerSize, size };
}

function findChild(bytes: Uint8Array, from: number, to: number, type: string): Box | undefined {
    let at = from;
    while (at + 8 <= to) {
        const box = readBoxHeader(bytes, at);
        if (!box) return undefined;
        if (box.type === type) return box;
        if (box.size < box.headerSize) return undefined;
        at += box.size;
    }
    return undefined;
}

/** Reads the `moov` box (header included) of an MP4 or a MOV. */
export function parseMoov(moov: Uint8Array): MediaMeta {
    const header = readBoxHeader(moov, 0);
    if (!header || header.type !== "moov") return {};
    const end = Math.min(moov.length, header.size || moov.length);
    const data = view(moov);
    const result: MediaMeta = {};

    const mvhd = findChild(moov, header.headerSize, end, "mvhd");
    if (mvhd) {
        const body = mvhd.start + mvhd.headerSize;
        const version = moov[body];
        let created: number | undefined;
        let timescale: number | undefined;
        let duration: number | undefined;
        if (version === 0 && body + 20 <= moov.length) {
            created = data.getUint32(body + 4, false);
            timescale = data.getUint32(body + 12, false);
            duration = data.getUint32(body + 16, false);
        } else if (version === 1 && body + 32 <= moov.length) {
            created = Number(data.getBigUint64(body + 4, false));
            timescale = data.getUint32(body + 20, false);
            duration = Number(data.getBigUint64(body + 24, false));
        }
        if (created && created > 0) {
            const when = created * 1000 - MS_FROM_1904_TO_1970;
            if (when > 0 && when < Date.now() + 86_400_000) result.takenAt = when;
        }
        if (timescale && duration !== undefined && timescale > 0) result.duration = duration / timescale;
    }

    // the first track that has a picture size is the video
    let at = header.headerSize;
    while (at + 8 <= end) {
        const box = readBoxHeader(moov, at);
        if (!box || box.size < box.headerSize) break;
        if (box.type === "trak") {
            const tkhd = findChild(moov, box.start + box.headerSize, Math.min(end, box.start + box.size), "tkhd");
            if (tkhd) {
                const body = tkhd.start + tkhd.headerSize;
                const version = moov[body];
                // after the version, the times, the track number and the length come the layer, the group, the volume, the matrix of nine
                // 32-bit numbers (of which the first two tell the turn) and the size as two 16.16 numbers
                const shift = version === 1 ? 12 : 0;
                const matrixAt = body + 40 + shift;
                const sizeAt = body + 76 + shift;
                if (sizeAt + 8 <= moov.length) {
                    const a = data.getInt32(matrixAt, false) / 65536;
                    const b = data.getInt32(matrixAt + 4, false) / 65536;
                    const width = data.getUint32(sizeAt, false) / 65536;
                    const height = data.getUint32(sizeAt + 4, false) / 65536;
                    if (width > 0 && height > 0) {
                        const turned = Math.abs(a) < 0.5 && Math.abs(b) > 0.5; // a turn of 90 or 270 degrees swaps the sides
                        Object.assign(result, oriented(Math.round(width), Math.round(height), turned));
                        break;
                    }
                }
            }
        }
        at += box.size;
    }
    return result;
}

// ---------------------------------------------------------------------------------------------------------------------

/** Reads what can be read of the first bytes of an image file, by its extension (and, for the formats that are told apart, by what is inside). */
export function parseImageHeader(fileName: string, bytes: Uint8Array): MediaMeta {
    switch (extensionOf(fileName)) {
        case "jpg":
        case "jpeg": return parseJpeg(bytes);
        case "png": return parsePng(bytes);
        case "webp": return parseWebp(bytes);
        case "gif": return parseGif(bytes);
        case "heic":
        case "heif": return parseHeic(bytes);
        default: return {};
    }
}
