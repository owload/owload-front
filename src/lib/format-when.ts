const TIME = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const DAY_OF_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Feb 2, 19:32"; with the year when it is not this year. An empty string for a value that is not a date. */
export function formatDateTime(iso: string | null | undefined, now: Date = new Date()): string {
    const date = iso ? new Date(iso) : undefined;
    if (!date || Number.isNaN(date.getTime())) return "";
    const day = date.getFullYear() === now.getFullYear() ? DAY.format(date) : DAY_OF_YEAR.format(date);
    return `${day}, ${TIME.format(date)}`;
}

/** "active now" for the last couple of minutes, else "Last seen Feb 2, 19:32". */
export function describeLastSeen(iso: string, now: Date = new Date()): string {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime()) && now.getTime() - date.getTime() < 2 * 60_000) return "active now";
    return `Last seen ${formatDateTime(iso, now)}`;
}

/** "Today", "Yesterday" or "Oct 6" (with the year when it is not this year), for the heading of a day in a list. */
export function formatDayHeading(iso: string, now: Date = new Date()): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return date.getFullYear() === now.getFullYear() ? DAY.format(date) : DAY_OF_YEAR.format(date);
}
