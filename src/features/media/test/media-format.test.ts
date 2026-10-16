import { describe, expect, it } from "vitest";
import { describeCounts, formatDuration } from "../media-format";

describe("formatDuration", () => {
    it("writes minutes and seconds, and hours when needed", () => {
        expect(formatDuration(0)).toBe("0:00");
        expect(formatDuration(7.4)).toBe("0:07");
        expect(formatDuration(65)).toBe("1:05");
        expect(formatDuration(3725)).toBe("1:02:05");
    });

    it("says nothing for a length that is not one", () => {
        expect(formatDuration(NaN)).toBe("");
        expect(formatDuration(-1)).toBe("");
    });
});

describe("describeCounts", () => {
    it("counts photos and videos in words", () => {
        expect(describeCounts(1, 0)).toBe("1 photo");
        expect(describeCounts(1234, 0)).toBe("1,234 photos");
        expect(describeCounts(0, 1)).toBe("1 video");
        expect(describeCounts(3, 2)).toBe("3 photos and 2 videos");
        expect(describeCounts(0, 0)).toBe("Nothing here yet");
    });
});
