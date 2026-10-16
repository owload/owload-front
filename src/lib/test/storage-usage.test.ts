import { describe, expect, it } from "vitest";
import { FREE_PLAN_STORAGE_BYTES, storagePercent } from "../storage-usage";

describe("storagePercent", () => {
    it("is the share of the plan's storage, with a sliver for anything stored and never over 100", () => {
        expect(storagePercent(0)).toBe(0);
        expect(storagePercent(1)).toBe(2);
        expect(storagePercent(FREE_PLAN_STORAGE_BYTES / 2)).toBe(50);
        expect(storagePercent(FREE_PLAN_STORAGE_BYTES * 2)).toBe(100);
    });

    it("can be the share of something else, such as of everything stored", () => {
        expect(storagePercent(25, 100)).toBe(25);
        expect(storagePercent(0, 100)).toBe(0);
        expect(storagePercent(10, 0)).toBe(0);
    });
});
