import { describe, expect, it } from "vitest";
import { parseLimit, splitLimit } from "../storage-limit";

describe("parseLimit", () => {
    it("turns a number and a unit into bytes", () => {
        expect(parseLimit("5", "GB")).toBe(5 * 1024 ** 3);
        expect(parseLimit("1.5", "GB")).toBe(1.5 * 1024 ** 3);
        expect(parseLimit("1,5", "GB")).toBe(1.5 * 1024 ** 3);
        expect(parseLimit(" 512 ", "MB")).toBe(512 * 1024 ** 2);
        expect(parseLimit("2", "TB")).toBe(2 * 1024 ** 4);
    });

    it("refuses what is not a limit: empty, zero, negative, text, less than a megabyte, absurdly large", () => {
        for (const text of ["", "  ", "0", "-3", "abc", "1e400", "0.0001"]) expect(parseLimit(text, "GB")).toBeUndefined();
        expect(parseLimit("0.5", "MB")).toBeUndefined();
        expect(parseLimit("2000000000", "TB")).toBeUndefined();
    });
});

describe("splitLimit", () => {
    it("picks the unit the figure reads best in, without trailing zeros", () => {
        expect(splitLimit(5 * 1024 ** 3)).toEqual({ text: "5", unit: "GB" });
        expect(splitLimit(1.5 * 1024 ** 3)).toEqual({ text: "1.5", unit: "GB" });
        expect(splitLimit(512 * 1024 ** 2)).toEqual({ text: "512", unit: "MB" });
        expect(splitLimit(3 * 1024 ** 4)).toEqual({ text: "3", unit: "TB" });
        expect(splitLimit(10)).toEqual({ text: "0", unit: "MB" });
    });

    it("round-trips what parseLimit made", () => {
        for (const [text, unit] of [["5", "GB"], ["1.25", "GB"], ["300", "MB"], ["2", "TB"]] as const) {
            const split = splitLimit(parseLimit(text, unit)!);
            expect(parseLimit(split.text, split.unit)).toBe(parseLimit(text, unit));
        }
    });
});
