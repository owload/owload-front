import { describe, expect, it } from "vitest";
import { FREE_PLAN_STORAGE_BYTES, ownedStorage, storagePercent } from "../owned-storage";

const drive = (myRole: "owner" | "reader" | "writer" | "admin", storedBytes: number | null) => ({ myRole, storedBytes });

describe("ownedStorage", () => {
    it("adds up the drives the user owns and leaves out the ones shared with them", () => {
        expect(ownedStorage([drive("owner", 100), drive("reader", 5000), drive("owner", 250), drive("admin", 70), drive("writer", 9)]))
            .toEqual({ usedBytes: 350, driveCount: 2, complete: true });
    });

    it("is nothing for a user with no drives of their own", () => {
        expect(ownedStorage([])).toEqual({ usedBytes: 0, driveCount: 0, complete: true });
        expect(ownedStorage([drive("reader", 10)])).toEqual({ usedBytes: 0, driveCount: 0, complete: true });
    });

    it("says it is not complete while the server has not counted some of the drives", () => {
        expect(ownedStorage([drive("owner", 100), drive("owner", null), drive("reader", null)])).toEqual({ usedBytes: 100, driveCount: 2, complete: false });
    });
});

describe("storagePercent", () => {
    it("is the share of the plan's storage, with a sliver for anything stored and never over 100", () => {
        expect(storagePercent(0)).toBe(0);
        expect(storagePercent(1)).toBe(2);
        expect(storagePercent(FREE_PLAN_STORAGE_BYTES / 2)).toBe(50);
        expect(storagePercent(FREE_PLAN_STORAGE_BYTES * 2)).toBe(100);
    });
});
