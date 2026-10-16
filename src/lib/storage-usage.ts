/** The Free plan's storage in Owload's own storage (the S3 presets), a fixed figure until plans are connected to the backend. Storage on the
 *  user's own S3 is not limited. */
export const FREE_PLAN_STORAGE_BYTES = 3 * 1024 ** 3;

/** The width of a usage bar, 0-100: the share of `totalBytes` that `usedBytes` is, with a sliver for anything stored. */
export function storagePercent(usedBytes: number, totalBytes: number = FREE_PLAN_STORAGE_BYTES): number {
    if (!(usedBytes > 0) || !(totalBytes > 0)) return 0;
    return Math.min(100, Math.max(2, Math.round((usedBytes / totalBytes) * 100)));
}
