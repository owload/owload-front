import { describe, expect, it } from "vitest";
import { readMediaMeta, readMediaMetaChecked, readMoov, type ReadRange } from "../media-reader";
import { concat, heicExifItem, heicHeadWithItemTable, jpeg, moov, text, u32 } from "./media-meta-fixtures";

/** A file that is mostly empty: only the given pieces exist, the rest reads as zeros, so that a file of gigabytes costs nothing. */
function sparseFile(length: number, pieces: Array<[number, Uint8Array]>): { read: ReadRange; reads: Array<[number, number]> } {
    const reads: Array<[number, number]> = [];
    const read: ReadRange = async (offset, wanted) => {
        const end = Math.min(length, offset + wanted);
        reads.push([offset, end - offset]);
        const out = new Uint8Array(Math.max(0, end - offset));
        for (const [at, bytes] of pieces) {
            const from = Math.max(at, offset);
            const to = Math.min(at + bytes.length, end);
            if (from < to) out.set(bytes.subarray(from - at, to - at), from - offset);
        }
        return out;
    };
    return { read, reads };
}

const box = (type: string, size: number) => concat(u32(size), text(type));
const created = Date.UTC(2024, 2, 9, 12, 0, 0) / 1000 + 2082844800;

describe("readMoov", () => {
    it("finds a moov at the start without walking the file", async () => {
        const index = moov({ created, width: 640, height: 480 });
        const file = sparseFile(500_000, [[0, box("ftyp", 24)], [24, index]]);
        const found = await readMoov(500_000, file.read);
        expect(found?.length).toBe(index.length);
        expect(file.reads).toHaveLength(1); // the start of the file held all of it
    });

    it("jumps over the pictures to a moov at the end of a big file, reading only the headers on the way", async () => {
        const length = 3_000_000_000;
        const index = moov({ created, duration: 5000, width: 1920, height: 1080 });
        const mdatAt = 32;
        const mdatSize = length - mdatAt - index.length;
        const file = sparseFile(length, [[0, box("ftyp", 32)], [mdatAt, box("mdat", mdatSize)], [length - index.length, index]]);
        const found = await readMoov(length, file.read);
        expect(found?.length).toBe(index.length);
        const bytesRead = file.reads.reduce((n, [, size]) => n + size, 0);
        expect(bytesRead).toBeLessThan(200_000); // the three gigabytes were not touched
    });

    it("gives up on a box that claims to be absurdly big, on a file without a moov, and on a file that is cut short", async () => {
        expect(await readMoov(100_000_000, sparseFile(100_000_000, [[0, box("ftyp", 24)], [24, box("moov", 90_000_000)]]).read)).toBeUndefined();
        expect(await readMoov(24, sparseFile(24, [[0, box("ftyp", 24)]]).read)).toBeUndefined();
        expect(await readMoov(1000, sparseFile(1000, []).read)).toBeUndefined();
    });
});

describe("readMediaMeta", () => {
    it("reads a photo's header and a video's index", async () => {
        const photo = jpeg({ exif: { date: "2024:03:09 14:05:33" }, width: 400, height: 300 });
        expect(await readMediaMeta("a.jpg", photo.length, sparseFile(photo.length, [[0, photo]]).read)).toMatchObject({ width: 400, height: 300 });

        const index = moov({ created, duration: 2000, width: 1280, height: 720 });
        const length = 24 + index.length;
        expect(await readMediaMeta("a.mp4", length, sparseFile(length, [[0, box("ftyp", 24)], [24, index]]).read)).toMatchObject({ width: 1280, height: 720, duration: 2 });
    });

    it("says nothing for a file of another kind, and does not throw for one that cannot be read", async () => {
        expect(await readMediaMeta("notes.txt", 10, sparseFile(10, []).read)).toEqual({});
        expect(await readMediaMeta("a.jpg", 10, async () => { throw new Error("network"); })).toEqual({});
    });

    it("tells a failure to read from a file that has nothing to tell", async () => {
        const failing = await readMediaMetaChecked("a.jpg", 10, async () => { throw new Error("network"); });
        expect(failing).toEqual({ meta: {}, failed: true });
        const empty = await readMediaMetaChecked("a.png", 4, sparseFile(4, []).read);
        expect(empty).toEqual({ meta: {}, failed: false });
    });
});


describe("a HEIC whose EXIF is far from the start", () => {
    it("finds the date where the item table says, which is behind the picture, and reads only a little of the file", async () => {
        const length = 6_000_000;
        const exifAt = 5_400_000;
        const item = heicExifItem({ date: "2024:08:15 09:10:11", offset: "+02:00" });
        const head = heicHeadWithItemTable({ exifOffset: exifAt, exifLength: item.length });
        const file = sparseFile(length, [[0, head], [exifAt, item]]);
        const meta = await readMediaMeta("IMG_0001.HEIC", length, file.read);
        expect(meta.takenAt).toBe(Date.UTC(2024, 7, 15, 7, 10, 11));
        expect(file.reads.reduce((n, [, size]) => n + size, 0)).toBeLessThan(300_000);
    });

    it("still says nothing of the date when the table points outside the file", async () => {
        const head = heicHeadWithItemTable({ exifOffset: 9_000_000, exifLength: 100 });
        const meta = await readMediaMeta("a.heic", 1_000_000, sparseFile(1_000_000, [[0, head]]).read);
        expect(meta.takenAt).toBeUndefined();
    });
});
