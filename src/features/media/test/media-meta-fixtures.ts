// Builders of small files with the structures the parsers read (the real files are too big to keep; these hold the same boxes and tags).

const encoder = new TextEncoder();

export function concat(...parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
}

export const text = (value: string) => encoder.encode(value);
export const u8 = (...values: number[]) => Uint8Array.from(values);
export const u16 = (value: number, little = false) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, value, little); return b; };
export const u32 = (value: number, little = false) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value, little); return b; };

export interface TiffOptions {
    date?: string;
    changed?: string;
    offset?: string;
    orientation?: number;
    width?: number;
    height?: number;
    little?: boolean;
}

/** A TIFF structure with the tags of an EXIF block: IFD0 (orientation, change date, pointer) and the EXIF IFD (dates, size). */
export function tiff({ date, changed, offset, orientation, width, height, little = false }: TiffOptions): Uint8Array {
    const w16 = (v: number) => u16(v, little);
    const w32 = (v: number) => u32(v, little);
    const entry = (tag: number, type: number, count: number, value: Uint8Array) => concat(w16(tag), w16(type), w32(count), value);
    const ascii = (value: string) => text(value + "\0");

    const ifd0Entries = (orientation !== undefined ? 1 : 0) + (changed ? 1 : 0) + 1;
    const exifEntries = (date ? 1 : 0) + (offset ? 1 : 0) + (width !== undefined ? 2 : 0);
    const ifd0Size = 2 + ifd0Entries * 12 + 4;
    const exifIfdAt = 8 + ifd0Size;
    const exifSize = 2 + exifEntries * 12 + 4;
    let dataAt = exifIfdAt + exifSize;
    const data: Uint8Array[] = [];
    const place = (bytes: Uint8Array) => { const at = dataAt; data.push(bytes); dataAt += bytes.length; return at; };

    const ifd0: Uint8Array[] = [];
    if (orientation !== undefined) ifd0.push(entry(0x0112, 3, 1, concat(w16(orientation), u8(0, 0))));
    if (changed) { const value = ascii(changed); ifd0.push(entry(0x0132, 2, value.length, w32(place(value)))); }
    ifd0.push(entry(0x8769, 4, 1, w32(exifIfdAt)));

    const exif: Uint8Array[] = [];
    if (date) { const value = ascii(date); exif.push(entry(0x9003, 2, value.length, w32(place(value)))); }
    if (offset) { const value = ascii(offset); exif.push(entry(0x9011, 2, value.length, w32(place(value)))); }
    if (width !== undefined && height !== undefined) {
        exif.push(entry(0xa002, 4, 1, w32(width)));
        exif.push(entry(0xa003, 4, 1, w32(height)));
    }
    return concat(
        text(little ? "II" : "MM"), w16(42), w32(8),
        w16(ifd0Entries), ...ifd0, w32(0),
        w16(exifEntries), ...exif, w32(0),
        ...data,
    );
}

export function jpeg({ exif, width, height }: { exif?: TiffOptions; width?: number; height?: number }): Uint8Array {
    const parts: Uint8Array[] = [u8(0xff, 0xd8)];
    if (exif) {
        const body = concat(text("Exif\0\0"), tiff(exif));
        parts.push(u8(0xff, 0xe1), u16(body.length + 2), body);
    }
    if (width !== undefined && height !== undefined) {
        parts.push(u8(0xff, 0xc0), u16(17), u8(8), u16(height), u16(width), u8(3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1));
    }
    parts.push(u8(0xff, 0xda, 0, 2));
    return concat(...parts);
}

export function png({ width, height, exif }: { width: number; height: number; exif?: TiffOptions }): Uint8Array {
    const chunk = (type: string, body: Uint8Array) => concat(u32(body.length), text(type), body, u32(0));
    return concat(
        u8(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
        chunk("IHDR", concat(u32(width), u32(height), u8(8, 6, 0, 0, 0))),
        ...(exif ? [chunk("eXIf", tiff(exif))] : []),
        chunk("IDAT", u8(0)),
    );
}

const box = (type: string, body: Uint8Array) => concat(u32(body.length + 8), text(type), body);

export function heic({ sizes, turns, exif }: { sizes: Array<[number, number]>; turns?: number; exif?: TiffOptions }): Uint8Array {
    const ispes = sizes.map(([w, h]) => box("ispe", concat(u32(0), u32(w), u32(h))));
    const irot = turns === undefined ? [] : [box("irot", u8(turns))];
    const exifItem = exif ? [u32(6), text("Exif\0\0"), tiff(exif)] : [];
    return concat(box("ftyp", concat(text("heic"), u32(0), text("mif1"))), box("meta", concat(u32(0), box("iprp", concat(...ispes, ...irot)))), ...exifItem);
}

export interface Mp4Options {
    /** Seconds since 1904, as the file stores them. */
    created?: number;
    timescale?: number;
    duration?: number;
    width?: number;
    height?: number;
    /** A turn of 90 degrees: the matrix [0 1 -1 0]. */
    turned?: boolean;
    version1?: boolean;
}

const fixed = (value: number) => u32(Math.round(value * 65536));

export function moov({ created = 0, timescale = 1000, duration = 0, width, height, turned, version1 }: Mp4Options): Uint8Array {
    const mvhd = version1
        ? box("mvhd", concat(u8(1, 0, 0, 0), u32(0), u32(created), u32(0), u32(0), u32(timescale), u32(0), u32(duration), new Uint8Array(80)))
        : box("mvhd", concat(u8(0, 0, 0, 0), u32(created), u32(0), u32(timescale), u32(duration), new Uint8Array(80)));
    const matrix = turned
        ? concat(fixed(0), fixed(1), u32(0), fixed(-1), fixed(0), u32(0), u32(0), u32(0), u32(0x40000000))
        : concat(fixed(1), fixed(0), u32(0), fixed(0), fixed(1), u32(0), u32(0), u32(0), u32(0x40000000));
    const tkhd = box("tkhd", concat(u8(0, 0, 0, 7), u32(0), u32(0), u32(1), u32(0), u32(duration), new Uint8Array(8), u16(0), u16(0), u16(0), u16(0), matrix, fixed(width ?? 0), fixed(height ?? 0)));
    const audioTkhd = box("tkhd", concat(u8(0, 0, 0, 7), u32(0), u32(0), u32(2), u32(0), u32(duration), new Uint8Array(8), u16(0), u16(0), u16(0), u16(0), new Uint8Array(36), fixed(0), fixed(0)));
    const tracks = width !== undefined ? [box("trak", audioTkhd), box("trak", tkhd)] : [];
    return box("moov", concat(mvhd, ...tracks));
}

export function mp4({ moovAtEnd, ...options }: Mp4Options & { moovAtEnd?: boolean }): Uint8Array {
    const ftyp = box("ftyp", concat(text("isom"), u32(512), text("isom")));
    const mdat = box("mdat", new Uint8Array(1000));
    return moovAtEnd ? concat(ftyp, mdat, moov(options)) : concat(ftyp, moov(options), mdat);
}

/**
 * A HEIC head with the tables a phone writes: `iinf` names the items (a picture and the EXIF block), `iloc` says where each is in the file.
 * The EXIF item itself is not in the head: it is at `exifOffset`, where the caller puts it.
 */
export function heicHeadWithItemTable({ exifOffset, exifLength, exifItemId = 2 }: { exifOffset: number; exifLength: number; exifItemId?: number }): Uint8Array {
    const infe = (id: number, type: string) => box("infe", concat(u8(2, 0, 0, 0), u16(id), u16(0), text(type), u8(0)));
    const iinf = box("iinf", concat(u8(0, 0, 0, 0), u16(2), infe(1, "hvc1"), infe(exifItemId, "Exif")));
    // version 1: the offset and the length are four bytes, there is no base offset and no index
    const item = (id: number, offset: number, length: number) => concat(u16(id), u16(0), u16(0), u16(1), u32(offset), u32(length));
    const iloc = box("iloc", concat(u8(1, 0, 0, 0), u8(0x44, 0x00), u16(2), item(1, 100_000, 5000), item(exifItemId, exifOffset, exifLength)));
    return concat(box("ftyp", concat(text("heic"), u32(0), text("mif1"))), box("meta", concat(u32(0), iinf, iloc)));
}

/** The bytes of an EXIF item as a HEIC holds them: the distance to the TIFF header, "Exif\0\0", then the TIFF structure. */
export function heicExifItem(options: TiffOptions): Uint8Array {
    return concat(u32(6), text("Exif\0\0"), tiff(options));
}
