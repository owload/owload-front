import { getApiCall } from "../api/api";

/** What the drives the user owns take in the storages (GET /userinfo/storage): in Owload's own (S3 presets) and in the user's own S3. */
export interface StorageUsage {
    presetBytes: number;
    customBytes: number;
    presetDrives: number;
    customDrives: number;
    /** False while the server has not counted some storage of some drive yet: the numbers are then a part of the whole. */
    complete: boolean;
    /** What the plan allows in Owload's own storage, the same for everybody (the user's own S3 is not held by it). */
    limitBytes: number;
}

export function getStorageUsage(): Promise<StorageUsage> {
    return getApiCall<StorageUsage>("/userinfo/storage");
}
