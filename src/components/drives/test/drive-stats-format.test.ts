import { describe, expect, it } from "vitest";
import { formatBytes, usedPercent } from "../drive-stats-format";

describe("formatBytes", () => {
    it("writes sizes short", () => {
        expect(formatBytes(0)).toBe("0 B");
        expect(formatBytes(-5)).toBe("0 B");
        expect(formatBytes(900)).toBe("900 B");
        expect(formatBytes(1536)).toBe("1.5 KB");
        expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
        expect(formatBytes(1.5 * 1024 ** 3)).toBe("1.5 GB");
        expect(formatBytes(3 * 1024 ** 4)).toBe("3 TB");
        expect(formatBytes(2 * 1024 ** 2)).toBe("2 MB");
        expect(formatBytes(2.5 * 1024 ** 2)).toBe("2.5 MB");
    });
});

describe("usedPercent", () => {
    it("is the share the files take of what is stored, kept between 0 and 100", () => {
        expect(usedPercent(50, 200)).toBe(25);
        expect(usedPercent(300, 200)).toBe(100);
        expect(usedPercent(0, 200)).toBe(0);
    });

    it("is unknown when the files are not counted yet or nothing is stored", () => {
        expect(usedPercent(undefined, 200)).toBeUndefined();
        expect(usedPercent(10, 0)).toBeUndefined();
        expect(usedPercent(10, null)).toBeUndefined();
    });
});
