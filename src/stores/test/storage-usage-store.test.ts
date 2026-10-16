import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const usage = (complete: boolean) => ({ presetBytes: 100, customBytes: 50, presetDrives: 1, customDrives: 1, complete });
const getStorageUsage = vi.fn();
vi.mock("@/engine/backend/storage-usage-backend", () => ({ getStorageUsage: () => getStorageUsage() }));

async function freshStore() {
    vi.resetModules();
    return (await import("../storage-usage-store")).useStorageUsageStore;
}

describe("storage usage store", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        getStorageUsage.mockReset();
    });
    afterEach(() => vi.useRealTimers());

    it("keeps what the server said", async () => {
        getStorageUsage.mockResolvedValue(usage(true));
        const store = await freshStore();
        await store.getState().refresh();
        expect(store.getState().usage).toEqual(usage(true));
    });

    it("asks once for requests made at the same time", async () => {
        getStorageUsage.mockResolvedValue(usage(true));
        const store = await freshStore();
        await Promise.all([store.getState().refresh(), store.getState().refresh(), store.getState().refresh()]);
        expect(getStorageUsage).toHaveBeenCalledTimes(1);
    });

    it("asks again after a few seconds while the server is still counting, and stops when it has counted", async () => {
        getStorageUsage.mockResolvedValueOnce(usage(false)).mockResolvedValueOnce(usage(false)).mockResolvedValue(usage(true));
        const store = await freshStore();
        await store.getState().refresh();
        expect(getStorageUsage).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(3000);
        expect(getStorageUsage).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(3000);
        expect(getStorageUsage).toHaveBeenCalledTimes(3);
        await vi.advanceTimersByTimeAsync(30000);
        expect(getStorageUsage).toHaveBeenCalledTimes(3);
        expect(store.getState().usage?.complete).toBe(true);
    });

    it("does not ask for ever when the server never finishes counting", async () => {
        getStorageUsage.mockResolvedValue(usage(false));
        const store = await freshStore();
        await store.getState().refresh();
        await vi.advanceTimersByTimeAsync(60000);
        expect(getStorageUsage.mock.calls.length).toBeLessThanOrEqual(7);
    });

    it("leaves what is shown as it is when a request fails", async () => {
        getStorageUsage.mockResolvedValueOnce(usage(true)).mockRejectedValueOnce(new Error("down"));
        const store = await freshStore();
        await store.getState().refresh();
        await store.getState().refresh();
        expect(store.getState().usage).toEqual(usage(true));
    });
});
