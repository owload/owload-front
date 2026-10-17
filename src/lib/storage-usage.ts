/** The width of a usage bar, 0-100: the share of `totalBytes` that `usedBytes` is, with a sliver for anything stored. */
export function storagePercent(usedBytes: number, totalBytes: number): number {
    if (!(usedBytes > 0) || !(totalBytes > 0)) return 0;
    return Math.min(100, Math.max(2, Math.round((usedBytes / totalBytes) * 100)));
}
