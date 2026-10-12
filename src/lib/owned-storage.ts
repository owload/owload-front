import type { DriveInfo } from "@/engine";

/** The Free plan's storage, a fixed figure until plans are connected to the backend (the Upgrade button leads to the pricing page). */
export const FREE_PLAN_STORAGE_BYTES = 3 * 1024 ** 3;

export interface OwnedStorage {
    /** Bytes taken on the servers by the drives the user owns (live files, old versions and previews together), as far as they are counted. */
    usedBytes: number;
    driveCount: number;
    /** False while the server has not counted some of the drives yet: the sum is then a part of the whole. */
    complete: boolean;
}

/** The space the user takes: the drives they own count, the ones that others shared with them do not (they are on the owner's account). */
export function ownedStorage(drives: ReadonlyArray<Pick<DriveInfo, "myRole" | "storedBytes">>): OwnedStorage {
    const owned = drives.filter((drive) => drive.myRole === "owner");
    return {
        usedBytes: owned.reduce((sum, drive) => sum + (drive.storedBytes ?? 0), 0),
        driveCount: owned.length,
        complete: owned.every((drive) => drive.storedBytes != null),
    };
}

/** The width of the storage bar, 0-100; a drive that holds anything shows at least a sliver. */
export function storagePercent(usedBytes: number, totalBytes: number = FREE_PLAN_STORAGE_BYTES): number {
    if (!(usedBytes > 0) || !(totalBytes > 0)) return 0;
    return Math.min(100, Math.max(2, Math.round((usedBytes / totalBytes) * 100)));
}
