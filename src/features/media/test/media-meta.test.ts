import { describe, expect, it } from "vitest";
import { locateHeicExif, mediaKind, parseExifDate, parseHeic, parseHeicExifItem, parseImageHeader, parseJpeg, parseMoov, parsePng, parseTiff, parseWebp, parseGif, readBoxHeader } from "../media-meta";
import { concat, heic, heicExifItem, heicHeadWithItemTable, jpeg, moov, mp4, png, text, tiff, u16, u32, u8 } from "./media-meta-fixtures";

const local = (y: number, mo: number, d: number, h: number, mi: number, s: number) => new Date(y, mo - 1, d, h, mi, s).getTime();

describe("parseExifDate", () => {
    it("is the camera's clock in the viewer's zone when the file says no zone", () => {
        expect(parseExifDate("2024:03:09 14:05:33")).toBe(local(2024, 3, 9, 14, 5, 33));
    });

    it("is an exact moment when the file gives the offset", () => {
        expect(parseExifDate("2024:03:09 14:05:33", "+03:00")).toBe(Date.UTC(2024, 2, 9, 11, 5, 33));
        expect(parseExifDate("2024:03:09 14:05:33", "-05:30")).toBe(Date.UTC(2024, 2, 9, 19, 35, 33));
    });

    it("refuses what is not a date", () => {
        expect(parseExifDate("")).toBeUndefined();
        expect(parseExifDate("0000:00:00 00:00:00")).toBeUndefined();
        expect(parseExifDate("2024:13:09 14:05:33")).toBeUndefined();
        expect(parseExifDate("yesterday")).toBeUndefined();
    });
});

describe("parseTiff", () => {
    it("reads the date taken, the orientation and the size, in either byte order", () => {
        for (const little of [false, true]) {
            const found = parseTiff(tiff({ date: "2023:12:24 18:30:00", orientation: 6, width: 4000, height: 3000, little }), 0);
            expect(found).toMatchObject({ takenAt: local(2023, 12, 24, 18, 30, 0), orientation: 6, width: 4000, height: 3000 });
        }
    });

    it("falls back to the date of the last change when there is no date taken", () => {
        expect(parseTiff(tiff({ changed: "2022:01:02 03:04:05" }), 0).takenAt).toBe(local(2022, 1, 2, 3, 4, 5));
    });

    it("gives nothing for bytes that are not a TIFF structure, or are cut short", () => {
        expect(parseTiff(text("not a tiff at all"), 0)).toEqual({});
        expect(parseTiff(tiff({ date: "2023:12:24 18:30:00" }).slice(0, 30), 0)).toEqual({});
        expect(parseTiff(new Uint8Array(0), 0)).toEqual({});
    });
});

describe("parseJpeg", () => {
    it("reads the date and the size of the picture", () => {
        expect(parseJpeg(jpeg({ exif: { date: "2024:03:09 14:05:33" }, width: 4032, height: 3024 }))).toEqual({ takenAt: local(2024, 3, 9, 14, 5, 33), width: 4032, height: 3024 });
    });

    it("turns the sides when the picture is rotated by its orientation tag", () => {
        expect(parseJpeg(jpeg({ exif: { date: "2024:03:09 14:05:33", orientation: 6 }, width: 4032, height: 3024 }))).toMatchObject({ width: 3024, height: 4032 });
        expect(parseJpeg(jpeg({ exif: { orientation: 3 }, width: 4032, height: 3024 }))).toMatchObject({ width: 4032, height: 3024 });
    });

    it("gives the size alone for a picture without EXIF, and nothing for what is not a JPEG", () => {
        expect(parseJpeg(jpeg({ width: 800, height: 600 }))).toEqual({ takenAt: undefined, width: 800, height: 600 });
        expect(parseJpeg(text("GIF89a"))).toEqual({});
        expect(parseJpeg(jpeg({ exif: { date: "2024:03:09 14:05:33" } }).slice(0, 12))).toEqual({ takenAt: undefined });
    });
});

describe("parsePng, parseWebp, parseGif", () => {
    it("reads the size of a PNG, and the date when it has an eXIf chunk", () => {
        expect(parsePng(png({ width: 1280, height: 720 }))).toEqual({ takenAt: undefined, width: 1280, height: 720 });
        expect(parsePng(png({ width: 1280, height: 720, exif: { date: "2020:05:06 07:08:09" } })).takenAt).toBe(local(2020, 5, 6, 7, 8, 9));
    });

    it("reads the size of a lossless WebP and of a GIF", () => {
        const bits = (1000 - 1) | ((500 - 1) << 14);
        const webp = concat(text("RIFF"), u32(0), text("WEBP"), text("VP8L"), u32(5, true), u8(0x2f), u32(bits, true), new Uint8Array(8));
        expect(parseWebp(webp)).toMatchObject({ width: 1000, height: 500 });
        expect(parseGif(concat(text("GIF89a"), u16(320, true), u16(200, true), new Uint8Array(4)))).toEqual({ width: 320, height: 200 });
    });
});

describe("parseHeic", () => {
    it("takes the largest picture as the photo, not its thumbnails", () => {
        expect(parseHeic(heic({ sizes: [[320, 240], [4032, 3024], [160, 120]] }))).toMatchObject({ width: 4032, height: 3024 });
    });

    it("turns the sides for a rotation of 90 or 270 degrees", () => {
        expect(parseHeic(heic({ sizes: [[4032, 3024]], turns: 1 }))).toMatchObject({ width: 3024, height: 4032 });
        expect(parseHeic(heic({ sizes: [[4032, 3024]], turns: 2 }))).toMatchObject({ width: 4032, height: 3024 });
        expect(parseHeic(heic({ sizes: [[4032, 3024]], turns: 3 }))).toMatchObject({ width: 3024, height: 4032 });
    });

    it("reads the date taken from the EXIF item", () => {
        expect(parseHeic(heic({ sizes: [[4032, 3024]], exif: { date: "2024:08:15 09:10:11", offset: "+02:00" } })).takenAt).toBe(Date.UTC(2024, 7, 15, 7, 10, 11));
    });

    it("gives nothing for what is not a HEIC", () => {
        expect(parseHeic(text("not an image file at all"))).toEqual({});
    });
});

describe("MP4 and MOV", () => {
    // 2024-03-09T12:00:00Z in seconds since 1904
    const created = Date.UTC(2024, 2, 9, 12, 0, 0) / 1000 + 2082844800;

    it("reads the date, the length and the size of the video", () => {
        expect(parseMoov(moov({ created, timescale: 600, duration: 6000, width: 1920, height: 1080 }))).toEqual({
            takenAt: Date.UTC(2024, 2, 9, 12, 0, 0), duration: 10, width: 1920, height: 1080,
        });
    });

    it("turns the sides of a video that is rotated by 90 degrees", () => {
        expect(parseMoov(moov({ created, width: 1920, height: 1080, turned: true }))).toMatchObject({ width: 1080, height: 1920 });
    });

    it("reads the version 1 of the header, with its 64-bit times", () => {
        const bytes = moov({ created, timescale: 1000, duration: 5000, width: 640, height: 480, version1: true });
        expect(parseMoov(bytes)).toMatchObject({ duration: 5 });
    });

    it("has no date when the file says none, and ignores a date in the future", () => {
        expect(parseMoov(moov({ created: 0, duration: 1000, width: 640, height: 480 })).takenAt).toBeUndefined();
        expect(parseMoov(moov({ created: Date.UTC(2999, 0, 1) / 1000 + 2082844800, width: 640, height: 480 })).takenAt).toBeUndefined();
    });

    it("gives nothing for bytes that are not a moov box", () => {
        expect(parseMoov(text("nonsense nonsense"))).toEqual({});
        expect(parseMoov(mp4({ created, width: 640, height: 480 }))).toEqual({}); // the whole file, not its moov
    });

    it("finds boxes by their headers, and reads a 64-bit size", () => {
        const file = mp4({ moovAtEnd: true, created, width: 640, height: 480 });
        expect(readBoxHeader(file, 0)).toMatchObject({ type: "ftyp" });
        const large = concat(u32(1), text("free"), u32(0), u32(24), new Uint8Array(8));
        expect(readBoxHeader(large, 0)).toMatchObject({ type: "free", headerSize: 16, size: 24 });
        expect(readBoxHeader(new Uint8Array(4), 0)).toBeUndefined();
    });
});

describe("parseImageHeader and mediaKind", () => {
    it("picks the parser by the extension", () => {
        expect(parseImageHeader("a.JPG", jpeg({ width: 10, height: 20 }))).toMatchObject({ width: 10, height: 20 });
        expect(parseImageHeader("a.png", png({ width: 30, height: 40 }))).toMatchObject({ width: 30, height: 40 });
        expect(parseImageHeader("a.txt", jpeg({ width: 10, height: 20 }))).toEqual({});
    });

    it("tells photos from videos by the extension", () => {
        expect(mediaKind("IMG_1.HEIC")).toBe("photo");
        expect(mediaKind("clip.mov")).toBe("video");
        expect(mediaKind("notes.txt")).toBeUndefined();
        expect(mediaKind("noextension")).toBeUndefined();
    });
});

describe("locateHeicExif and parseHeicExifItem", () => {
    it("finds the EXIF item through the item tables, wherever it is in the file", () => {
        const head = heicHeadWithItemTable({ exifOffset: 4_000_000, exifLength: 900 });
        expect(locateHeicExif(head)).toEqual({ offset: 4_000_000, length: 900 });
    });

    it("finds the right item when the EXIF is not the second one", () => {
        expect(locateHeicExif(heicHeadWithItemTable({ exifOffset: 777, exifLength: 64, exifItemId: 9 }))).toEqual({ offset: 777, length: 64 });
    });

    it("says nothing for a file without the tables, a cut table, or something that is not a HEIC", () => {
        expect(locateHeicExif(heic({ sizes: [[10, 10]] }))).toBeUndefined();
        expect(locateHeicExif(heicHeadWithItemTable({ exifOffset: 1, exifLength: 64 }).slice(0, 60))).toBeUndefined();
        expect(locateHeicExif(text("not a heic file at all"))).toBeUndefined();
    });

    it("reads the date from the bytes of the EXIF item", () => {
        const item = heicExifItem({ date: "2024:08:15 09:10:11", offset: "+02:00" });
        expect(parseHeicExifItem(item).takenAt).toBe(Date.UTC(2024, 7, 15, 7, 10, 11));
        expect(parseHeicExifItem(new Uint8Array(4))).toEqual({});
        expect(parseHeicExifItem(concat(u32(9999), new Uint8Array(20)))).toEqual({});
    });
});
