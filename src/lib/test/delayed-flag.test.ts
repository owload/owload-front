import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DelayedFlag } from "../delayed-flag";

describe("DelayedFlag", () => {
    let changes: boolean[];
    let flag: DelayedFlag;

    beforeEach(() => {
        vi.useFakeTimers();
        changes = [];
        flag = new DelayedFlag((shown) => changes.push(shown), 250, 400, () => Date.now());
    });

    afterEach(() => {
        flag.dispose();
        vi.useRealTimers();
    });

    it("never shows the placeholder when loading ends before it is due", () => {
        flag.setLoading(true);
        vi.advanceTimersByTime(249);
        flag.setLoading(false);
        vi.advanceTimersByTime(2000);
        expect(changes).toEqual([]);
    });

    it("shows it only after the delay, and keeps it for the minimum time", () => {
        flag.setLoading(true);
        vi.advanceTimersByTime(250);
        expect(changes).toEqual([true]);
        vi.advanceTimersByTime(100); // loading ends 100 ms after it was drawn
        flag.setLoading(false);
        vi.advanceTimersByTime(299);
        expect(changes).toEqual([true]);
        vi.advanceTimersByTime(1);
        expect(changes).toEqual([true, false]);
    });

    it("lets it go at once when it has already been there long enough", () => {
        flag.setLoading(true);
        vi.advanceTimersByTime(250);
        vi.advanceTimersByTime(1000);
        flag.setLoading(false);
        expect(changes).toEqual([true, false]);
    });

    it("keeps it when loading starts again while it is about to go", () => {
        flag.setLoading(true);
        vi.advanceTimersByTime(250);
        flag.setLoading(false);
        vi.advanceTimersByTime(100);
        flag.setLoading(true);
        vi.advanceTimersByTime(5000);
        expect(changes).toEqual([true]);
        flag.setLoading(false);
        expect(changes).toEqual([true, false]);
    });

    it("does not set up a second timer for repeated calls", () => {
        flag.setLoading(true);
        flag.setLoading(true);
        vi.advanceTimersByTime(250);
        expect(changes).toEqual([true]);
    });

    it("does nothing after it is disposed", () => {
        flag.setLoading(true);
        flag.dispose();
        vi.advanceTimersByTime(1000);
        expect(changes).toEqual([]);
    });
});
