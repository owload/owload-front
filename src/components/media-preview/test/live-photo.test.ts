import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLiveVideos, loadLiveVideo } from "../live-photo";

describe("loadLiveVideo", () => {
    afterEach(() => clearLiveVideos());

    it("reads the video once and gives the same address for it afterwards", async () => {
        const read = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
        const first = await loadLiveVideo("v1", read);
        const second = await loadLiveVideo("v1", read);
        expect(first).toBe(second);
        expect(first.startsWith("blob:")).toBe(true);
        expect(read).toHaveBeenCalledTimes(1);
    });

    it("keeps the last three videos and lets the oldest go", async () => {
        const read = (n: number) => vi.fn().mockResolvedValue(new Uint8Array([n]));
        const a = read(1), b = read(2), c = read(3), d = read(4);
        await loadLiveVideo("a", a); await loadLiveVideo("b", b); await loadLiveVideo("c", c); await loadLiveVideo("d", d);
        await loadLiveVideo("a", a); // gone: read again
        expect(a).toHaveBeenCalledTimes(2);
        await loadLiveVideo("c", c);
        expect(c).toHaveBeenCalledTimes(1);
    });

    it("does not remember a failure", async () => {
        const read = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValue(new Uint8Array([9]));
        await expect(loadLiveVideo("x", read)).rejects.toThrow("network");
        await expect(loadLiveVideo("x", read)).resolves.toMatch(/^blob:/);
    });
});
