import { describe, expect, it } from "vitest";
import { storagePercent } from "../storage-usage";

const LIMIT = 3 * 1024 ** 3;

describe("storagePercent", () => {
    it("is the share of the limit, with a sliver for anything stored and never over 100", () => {
        expect(storagePercent(0, LIMIT)).toBe(0);
        expect(storagePercent(1, LIMIT)).toBe(2);
        expect(storagePercent(LIMIT / 2, LIMIT)).toBe(50);
        expect(storagePercent(LIMIT * 2, LIMIT)).toBe(100);
    });

    it("can be the share of something else, such as of everything stored", () => {
        expect(storagePercent(25, 100)).toBe(25);
        expect(storagePercent(0, 100)).toBe(0);
        expect(storagePercent(10, 0)).toBe(0);
    });
});
