import { describe, expect, it, vi } from "vitest";
import { PhotoCache } from "../photo-cache";

describe("PhotoCache", () => {
    it("makes a picture once and then returns it at once", async () => {
        const cache = new PhotoCache(3, vi.fn());
        const make = vi.fn().mockResolvedValue("blob:a");
        expect(await cache.get("a", make)).toBe("blob:a");
        expect(await cache.get("a", make)).toBe("blob:a");
        expect(make).toHaveBeenCalledTimes(1);
    });

    it("makes a picture once for several that ask at the same time", async () => {
        const cache = new PhotoCache(3, vi.fn());
        let finish: (url: string) => void = () => undefined;
        const make = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
        const asks = [cache.get("a", make), cache.get("a", make), cache.get("a", make)];
        expect(cache.has("a")).toBe(true);
        finish("blob:a");
        expect(await Promise.all(asks)).toEqual(["blob:a", "blob:a", "blob:a"]);
        expect(make).toHaveBeenCalledTimes(1);
    });

    it("drops the one used longest ago, and releases its address", async () => {
        const release = vi.fn();
        const cache = new PhotoCache(2, release);
        await cache.get("a", async () => "blob:a");
        await cache.get("b", async () => "blob:b");
        await cache.get("a", async () => "blob:a2"); // a is used again: it is the newest, b the oldest
        await cache.get("c", async () => "blob:c");
        expect(release).toHaveBeenCalledTimes(1);
        expect(release).toHaveBeenCalledWith("blob:b");
        expect(cache.has("a")).toBe(true);
        expect(cache.has("b")).toBe(false);
    });

    it("does not remember a failure: the next ask tries again", async () => {
        const cache = new PhotoCache(2, vi.fn());
        const make = vi.fn().mockRejectedValueOnce(new Error("no")).mockResolvedValue("blob:a");
        await expect(cache.get("a", make)).rejects.toThrow("no");
        expect(cache.has("a")).toBe(false);
        expect(await cache.get("a", make)).toBe("blob:a");
    });

    it("releases everything when it is cleared", async () => {
        const release = vi.fn();
        const cache = new PhotoCache(5, release);
        await cache.get("a", async () => "blob:a");
        await cache.get("b", async () => "blob:b");
        cache.clear();
        expect(release).toHaveBeenCalledTimes(2);
        expect(cache.has("a")).toBe(false);
    });
});
