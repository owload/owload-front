export type LimitUnit = "MB" | "GB" | "TB";

export const LIMIT_UNITS: readonly LimitUnit[] = ["MB", "GB", "TB"];

const FACTOR: Record<LimitUnit, number> = { MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };

/** A limit the owner typed, in bytes; undefined for anything that is not a positive number of at least a megabyte (a comma may be the decimal mark). */
export function parseLimit(text: string, unit: LimitUnit): number | undefined {
    const value = Number(text.trim().replace(",", "."));
    if (!text.trim() || !Number.isFinite(value) || value <= 0) return undefined;
    const bytes = Math.round(value * FACTOR[unit]);
    return bytes >= FACTOR.MB && bytes <= 2 ** 50 ? bytes : undefined;
}

/** A limit in bytes as a number and the unit it reads best in (the largest unit that keeps it at least 1), without trailing zeros. */
export function splitLimit(bytes: number): { text: string; unit: LimitUnit } {
    const unit: LimitUnit = bytes >= FACTOR.TB ? "TB" : bytes >= FACTOR.GB ? "GB" : "MB";
    const value = bytes / FACTOR[unit];
    return { text: String(Math.round(value * 100) / 100), unit };
}
