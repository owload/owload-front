/** "0:07", "1:05", "1:02:05": the length of a video on its tile. */
export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "";
    const total = Math.round(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** "1 photo", "2 photos", "1 video and 3 photos"... as a short line under the title. */
export function describeCounts(photos: number, videos: number): string {
    const part = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
    if (photos > 0 && videos > 0) return `${part(photos, "photo", "photos")} and ${part(videos, "video", "videos")}`;
    if (photos > 0) return part(photos, "photo", "photos");
    if (videos > 0) return part(videos, "video", "videos");
    return "Nothing here yet";
}
