import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectMedia, MediaLibrary, pairLivePhotos, sortNewestFirst, type LibrarySnapshot, type MediaFileInfo, type MediaItem } from "../media-library";
import { jpeg, png } from "./media-meta-fixtures";

const file = (id: string, name: string, byteLength = 1000): MediaFileInfo => ({ id, name, byteOffset: 0, byteLength, finished: true });
const thumbName = (size: number, id: string) => `$$$sy$s$stem!_thumb_${size}_${id.replaceAll("/", "$")}`;
const taken = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const exifDate = (y: number, m: number, d: number) => `${y}:${String(m).padStart(2, "0")}:${String(d).padStart(2, "0")} 12:00:00`;

describe("collectMedia", () => {
    it("takes the finished photos and videos, links their small pictures by the name, and leaves the rest", () => {
        const files = [
            file("a/1", "a.jpg"), file("b/2", "b.mov"), file("c/3", "c.txt"), file("d/4", "d.heic"),
            { ...file("e/5", "e.jpg"), finished: false },
            file("t1", thumbName(360, "a/1")), file("t2", thumbName(1024, "a/1")), file("t3", thumbName(360, "b/2")),
            file("t4", thumbName(360, "gone/9")),
        ];
        const { media, thumbnails, previews } = collectMedia(files);
        expect(media.map((m) => m.id)).toEqual(["a/1", "b/2", "d/4"]);
        expect(thumbnails.get("a/1")?.id).toBe("t1");
        expect(previews.get("a/1")?.id).toBe("t2");
        expect(thumbnails.get("b/2")?.id).toBe("t3");
        expect(thumbnails.has("d/4")).toBe(false);
    });
});

describe("sortNewestFirst", () => {
    it("puts the latest taken first and breaks ties by name", () => {
        const make = (id: string, takenAt: number) => ({ id, name: id, takenAt }) as MediaItem;
        expect(sortNewestFirst([make("b", 1), make("c", 3), make("a", 1), make("d", 2)]).map((i) => i.id)).toEqual(["c", "d", "a", "b"]);
    });
});

describe("MediaLibrary", () => {
    let cache: unknown | null;
    let reads: string[];

    beforeEach(() => {
        vi.useFakeTimers();
        cache = null;
        reads = [];
    });
    afterEach(() => vi.useRealTimers());

    const contents: Record<string, Uint8Array> = {
        "a/1": jpeg({ exif: { date: exifDate(2024, 3, 9) }, width: 4000, height: 3000 }),
        "b/2": jpeg({ exif: { date: exifDate(2022, 7, 1), orientation: 6 }, width: 4000, height: 3000 }),
        "c/3": png({ width: 1280, height: 720 }), // a screenshot: no date of its own
    };

    function make(files: MediaFileInfo[], overrides: Partial<ConstructorParameters<typeof MediaLibrary>[0]> = {}) {
        return new MediaLibrary({
            files,
            read: async (f, offset, length) => { reads.push(f.id); return contents[f.id].slice(offset, offset + length); },
            loadCache: async () => cache,
            saveCache: async (value) => { cache = JSON.parse(JSON.stringify(value)); },
            uploadTimes: async () => new Map([["c/3", taken(2021, 1, 5)]]),
            ...overrides,
        });
    }

    const files = [file("a/1", "a.jpg"), file("b/2", "b.jpg"), file("c/3", "c.png"), file("t", thumbName(360, "a/1"))];

    it("reads the dates and sizes, sorts the newest first, and takes the upload date for a file that has none", async () => {
        const library = make(files);
        const run = library.start();
        await vi.runAllTimersAsync();
        await run;
        const { items, total, pending } = library.snapshot;
        expect(items.map((i) => i.id)).toEqual(["a/1", "b/2", "c/3"]);
        expect(items.map((i) => i.takenAt)).toEqual([taken(2024, 3, 9), taken(2022, 7, 1), taken(2021, 1, 5)]);
        expect(items.map((i) => i.dateFromUpload)).toEqual([false, false, true]);
        expect([total, pending]).toEqual([3, 0]);
        expect(items[0]).toMatchObject({ width: 4000, height: 3000, thumbnail: { id: "t" } });
        expect(items[0].aspect).toBeCloseTo(4 / 3);
        expect(items[1]).toMatchObject({ width: 3000, height: 4000 }); // turned by its orientation
    });

    it("keeps what it learned and does not read the files again the next time", async () => {
        const first = make(files);
        const run = first.start();
        await vi.runAllTimersAsync();
        await run;
        expect(reads.sort()).toEqual(["a/1", "b/2", "c/3"]);

        reads = [];
        const second = make(files);
        const again = second.start();
        await vi.runAllTimersAsync();
        await again;
        expect(reads).toEqual([]);
        expect(second.snapshot.items.map((i) => i.id)).toEqual(["a/1", "b/2", "c/3"]);
    });

    it("reads only the files that are new, and forgets the ones that are gone", async () => {
        const first = make(files);
        let run = first.start();
        await vi.runAllTimersAsync();
        await run;
        reads = [];
        const next = [file("a/1", "a.jpg"), file("c/3", "c.png")];
        const second = make(next);
        run = second.start();
        await vi.runAllTimersAsync();
        await run;
        expect(reads).toEqual([]);
        expect(second.snapshot.items.map((i) => i.id)).toEqual(["a/1", "c/3"]);
        expect((cache as { items: Record<string, unknown> }).items["b/2"]).toBeUndefined();
    });

    it("shows what it knows at once from the cache, and announces the rest as it comes", async () => {
        const first = make([file("a/1", "a.jpg")]);
        let run = first.start();
        await vi.runAllTimersAsync();
        await run;

        const seen: LibrarySnapshot[] = [];
        const second = make(files);
        second.subscribe((s) => seen.push(s));
        run = second.start();
        await vi.runAllTimersAsync();
        await run;
        expect(seen[0].items.map((i) => i.id)).toEqual(["a/1"]);
        expect(seen[0].pending).toBe(2);
        expect(seen[seen.length - 1].pending).toBe(0);
    });

    it("takes the upload date for a file that cannot be read now, and does not keep it, so that it is read again", async () => {
        let broken = true;
        const library = make(files, {
            read: async (f, offset, length) => { if (f.id === "b/2" && broken) throw new Error("network"); return contents[f.id].slice(offset, offset + length); },
            uploadTimes: async () => new Map([["b/2", taken(2020, 2, 2)], ["c/3", taken(2021, 1, 5)]]),
        });
        let run = library.start();
        await vi.runAllTimersAsync();
        await run;
        expect(library.snapshot.items.find((i) => i.id === "b/2")).toMatchObject({ takenAt: taken(2020, 2, 2), dateFromUpload: true });
        expect((cache as { items: Record<string, unknown> }).items["b/2"]).toBeUndefined();

        broken = false;
        reads = [];
        const again = make(files, { uploadTimes: async () => new Map([["c/3", taken(2021, 1, 5)]]) });
        run = again.start();
        await vi.runAllTimersAsync();
        await run;
        expect(reads).toEqual(["b/2"]);
        expect(again.snapshot.items.find((i) => i.id === "b/2")?.takenAt).toBe(taken(2022, 7, 1));
    });

    it("reads a few files at a time, not all at once", async () => {
        let running = 0;
        let most = 0;
        const many = Array.from({ length: 12 }, (_, i) => file(`m${i}`, `m${i}.jpg`));
        const library = new MediaLibrary({
            files: many,
            concurrency: 3,
            read: async () => { running++; most = Math.max(most, running); await new Promise((r) => setTimeout(r, 5)); running--; return jpeg({ exif: { date: exifDate(2024, 1, 1) }, width: 10, height: 10 }); },
            loadCache: async () => null,
            saveCache: async () => undefined,
            uploadTimes: async () => new Map(),
        });
        const run = library.start();
        await vi.runAllTimersAsync();
        await run;
        expect(most).toBe(3);
        expect(library.snapshot.items).toHaveLength(12);
    });

    it("ignores a cache it cannot understand", async () => {
        cache = { v: 99, items: "nonsense" };
        const library = make(files);
        const run = library.start();
        await vi.runAllTimersAsync();
        await run;
        expect(library.snapshot.items).toHaveLength(3);
    });

    it("stops announcing when it is stopped", async () => {
        const seen: LibrarySnapshot[] = [];
        const library = make(files);
        library.subscribe((s) => seen.push(s));
        const run = library.start();
        library.stop();
        await vi.runAllTimersAsync();
        await run;
        const count = seen.length;
        await vi.advanceTimersByTimeAsync(5000);
        expect(seen.length).toBe(count);
    });
});

describe("pairLivePhotos", () => {
    const item = (id: string, name: string, parentId: string | undefined, duration?: number): MediaItem => ({
        id, name, kind: /\.(mov|mp4)$/i.test(name) ? "video" : "photo", file: { id, name, byteOffset: 0, byteLength: 1, parentId },
        takenAt: 1, dateFromUpload: false, aspect: 1, duration,
    });

    it("shows a photo and the short video of the same shot as one, under the photo", () => {
        const paired = pairLivePhotos([item("p", "IMG_1234.HEIC", "f"), item("v", "IMG_1234.MOV", "f", 3), item("o", "IMG_9.HEIC", "f")]);
        expect(paired.map((i) => i.id)).toEqual(["p", "o"]);
        expect(paired[0].live?.id).toBe("v");
        expect(paired[1].live).toBeUndefined();
    });

    it("does not pair a long video, other folders, or a name that is not alone", () => {
        expect(pairLivePhotos([item("p", "IMG_1.HEIC", "f"), item("v", "IMG_1.MOV", "f", 40)])).toHaveLength(2);
        expect(pairLivePhotos([item("p", "IMG_1.HEIC", "f"), item("v", "IMG_1.MOV", "g", 3)])).toHaveLength(2);
        expect(pairLivePhotos([item("p", "IMG_1.HEIC", "f"), item("q", "IMG_1.JPG", "f"), item("v", "IMG_1.MOV", "f", 3)])).toHaveLength(3);
        expect(pairLivePhotos([item("v", "IMG_1.MOV", "f", 3), item("w", "IMG_1.mp4", "f", 3)])).toHaveLength(2);
    });

    it("pairs when the length of the video is not known yet, and ignores the case of the names", () => {
        const paired = pairLivePhotos([item("p", "img_1.heic", "f"), item("v", "IMG_1.MOV", "f")]);
        expect(paired).toHaveLength(1);
        expect(paired[0].live?.id).toBe("v");
    });

    it("leaves a list without pairs as it is", () => {
        const list = [item("a", "a.jpg", "f"), item("b", "b.mov", "f", 3)];
        expect(pairLivePhotos(list)).toBe(list);
    });
});
