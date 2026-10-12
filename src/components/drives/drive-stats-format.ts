const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** A size for a drive card: "0 B", "12 KB", "1.5 GB" (one decimal below ten, none above, so the card stays narrow). */
export function formatBytes(bytes: number): string {
    if (!(bytes > 0)) return "0 B";
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < UNITS.length - 1) {
        value /= 1024;
        unit++;
    }
    const digits = unit === 0 || value >= 10 ? 0 : 1;
    return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

/** "Dec 12, 2024, 12:32" in the user's own language and time zone. */
export function formatDateTime(milliseconds: number): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(milliseconds));
}

/** The share of the stored bytes that live files take, 0-100, or undefined when either is not known. */
export function usedPercent(usedBytes: number | undefined, storedBytes: number | null): number | undefined {
    if (usedBytes === undefined || storedBytes == null || !(storedBytes > 0)) return undefined;
    return Math.max(0, Math.min(100, Math.round((usedBytes / storedBytes) * 100)));
}
