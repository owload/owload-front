import { mediaKind, type MediaMeta } from "./media-meta";
import { readMediaMetaChecked, type ReadRange } from "./media-reader";

/** The system files that carry the small pictures of a file, found by their names (see use-files-store-ops: getPreviewFileName). */
const SYSTEM_PREFIX = "$$$sy$s$stem!_";
const THUMB_PREFIX = SYSTEM_PREFIX + "thumb_";
const THUMBNAIL_SIZE = 360;
const PREVIEW_SIZE = 1024;
const CACHE_VERSION = 1;

export interface MediaFileInfo {
    id: string;
    name: string;
    /** The folder it is in (the id of the folder); photos and their video are paired only within one folder. */
    parentId?: string;
    byteOffset: number;
    byteLength: number;
    finished?: boolean;
}

export interface MediaItem {
    id: string;
    name: string;
    kind: "photo" | "video";
    file: MediaFileInfo;
    /** When it was taken; for a file that does not say, when it was uploaded (see `dateFromUpload`). */
    takenAt: number;
    dateFromUpload: boolean;
    width?: number;
    height?: number;
    duration?: number;
    /** Width divided by height; 4:3 until the file says. */
    aspect: number;
    /** The small picture (about 360 pixels) and the larger one (about 1024), when the drive has them. */
    thumbnail?: MediaFileInfo;
    preview?: MediaFileInfo;
    /** The short video that was taken with this photo (a Live Photo of an iPhone: IMG_1234.HEIC and IMG_1234.MOV): one shot, one tile. */
    live?: MediaFileInfo;
}

export interface LibrarySnapshot {
    items: MediaItem[];
    /** How many media files the drive has, and how many of them have not been read yet (they are not in `items` until they are). */
    total: number;
    pending: number;
}

/** What is kept in the cache for a file. `t`: the date taken, `f`: it is the upload date, not one the file gave. */
interface CachedMeta {
    t?: number;
    w?: number;
    h?: number;
    d?: number;
    f?: 1;
}

export interface MediaLibraryDeps {
    /** Every file of the drive (the system files too). */
    files: MediaFileInfo[];
    read: (file: MediaFileInfo, offset: number, length: number) => Promise<Uint8Array>;
    loadCache: () => Promise<unknown | null>;
    saveCache: (value: unknown) => Promise<void>;
    /** When each file was uploaded (by the id of the file), asked for once, only if some file has no date of its own. */
    uploadTimes: () => Promise<Map<string, number>>;
    concurrency?: number;
    emitEveryMs?: number;
    saveEveryMs?: number;
}

/** The photos and videos among `files`, and the small pictures that go with them. */
export function collectMedia(files: MediaFileInfo[]): { media: MediaFileInfo[]; thumbnails: Map<string, MediaFileInfo>; previews: Map<string, MediaFileInfo> } {
    const thumbnails = new Map<string, MediaFileInfo>();
    const previews = new Map<string, MediaFileInfo>();
    const media: MediaFileInfo[] = [];
    for (const file of files) {
        if (file.finished === false) continue;
        if (file.name.startsWith(THUMB_PREFIX)) {
            const rest = file.name.slice(THUMB_PREFIX.length);
            const underscore = rest.indexOf("_");
            const size = Number(rest.slice(0, underscore));
            const id = rest.slice(underscore + 1).replaceAll("$", "/");
            if (size === THUMBNAIL_SIZE) thumbnails.set(id, file);
            else if (size === PREVIEW_SIZE) previews.set(id, file);
        } else if (!file.name.startsWith(SYSTEM_PREFIX) && mediaKind(file.name) !== undefined) {
            media.push(file);
        }
    }
    return { media, thumbnails, previews };
}

/** A Live Photo's video is at most a few seconds; a longer one with the same name is a video of its own. */
const LIVE_PHOTO_MAX_SECONDS = 6.5;
const LIVE_PHOTO_STILLS = ["heic", "heif", "jpg", "jpeg"];

function baseName(name: string): string {
    const dot = name.lastIndexOf(".");
    return (dot < 0 ? name : name.slice(0, dot)).toLowerCase();
}

/**
 * An iPhone saves a Live Photo as two files, a photo and a short MOV with the same name. They are one shot and are shown as one: the video
 * goes under its photo (the tile says it is live) and is not listed on its own. Only a photo and a video that are alone under that name in their
 * folder are paired, and a video longer than a few seconds is never taken for the companion of a photo.
 */
export function pairLivePhotos(items: MediaItem[]): MediaItem[] {
    const groups = new Map<string, { stills: MediaItem[]; videos: MediaItem[] }>();
    for (const item of items) {
        const extension = item.name.slice(item.name.lastIndexOf(".") + 1).toLowerCase();
        const isStill = item.kind === "photo" && LIVE_PHOTO_STILLS.includes(extension);
        const isMov = item.kind === "video" && extension === "mov";
        if (!isStill && !isMov) continue;
        const key = `${item.file.parentId ?? ""}/${baseName(item.name)}`;
        const group = groups.get(key) ?? { stills: [], videos: [] };
        (isStill ? group.stills : group.videos).push(item);
        groups.set(key, group);
    }
    const hidden = new Set<string>();
    const companions = new Map<string, MediaFileInfo>();
    for (const { stills, videos } of groups.values()) {
        if (stills.length !== 1 || videos.length !== 1) continue;
        const video = videos[0];
        if (video.duration !== undefined && video.duration > LIVE_PHOTO_MAX_SECONDS) continue;
        hidden.add(video.id);
        companions.set(stills[0].id, video.file);
    }
    if (hidden.size === 0) return items;
    return items.filter((item) => !hidden.has(item.id)).map((item) => (companions.has(item.id) ? { ...item, live: companions.get(item.id) } : item));
}

export function sortNewestFirst(items: MediaItem[]): MediaItem[] {
    return [...items].sort((a, b) => b.takenAt - a.takenAt || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function readCache(value: unknown): Map<string, CachedMeta> {
    const known = new Map<string, CachedMeta>();
    if (!value || typeof value !== "object") return known;
    const { v, items } = value as { v?: unknown; items?: unknown };
    if (v !== CACHE_VERSION || !items || typeof items !== "object") return known;
    for (const [id, entry] of Object.entries(items as Record<string, unknown>)) {
        if (entry && typeof entry === "object") known.set(id, entry as CachedMeta);
    }
    return known;
}

/**
 * The media of a drive with the date each was taken: from the cache where it is, else read from the head of the file (or the index of a
 * video), a few files at a time. The pictures the drive already holds as small files are linked to their photos. The result is announced
 * as it grows, at most every `emitEveryMs`. A file that says nothing about its date takes the date of its upload; a file that could not be
 * read takes it too, for now, and is read again next time.
 */
export class MediaLibrary {
    private readonly listeners = new Set<(snapshot: LibrarySnapshot) => void>();
    private readonly meta = new Map<string, CachedMeta>();
    private readonly provisional = new Set<string>();
    private media: MediaFileInfo[] = [];
    private thumbnails = new Map<string, MediaFileInfo>();
    private previews = new Map<string, MediaFileInfo>();
    private stopped = false;
    private emitTimer: ReturnType<typeof setTimeout> | undefined;
    private saveTimer: ReturnType<typeof setTimeout> | undefined;
    private dirty = false;
    private current: LibrarySnapshot = { items: [], total: 0, pending: 0 };

    constructor(private readonly deps: MediaLibraryDeps) {}

    get snapshot(): LibrarySnapshot {
        return this.current;
    }

    subscribe(listener: (snapshot: LibrarySnapshot) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    stop(): void {
        this.stopped = true;
        clearTimeout(this.emitTimer);
        clearTimeout(this.saveTimer);
        this.listeners.clear();
    }

    async start(): Promise<void> {
        const { media, thumbnails, previews } = collectMedia(this.deps.files);
        this.media = media;
        this.thumbnails = thumbnails;
        this.previews = previews;
        const ids = new Set(media.map((m) => m.id));
        const cached = readCache(await this.deps.loadCache().catch(() => null));
        for (const [id, entry] of cached) if (ids.has(id)) this.meta.set(id, entry);
        if (this.meta.size < cached.size) this.markDirty(); // files that have gone are dropped from what is kept
        this.rebuild();
        this.emitNow();

        const queue = media.filter((m) => !this.meta.has(m.id));
        await this.readAll(queue);
        if (this.stopped) return;
        await this.fillDatesFromUpload();
        if (this.stopped) return;
        this.rebuild();
        this.emitNow();
        await this.saveNow();
    }

    private async readAll(queue: MediaFileInfo[]): Promise<void> {
        const concurrency = Math.max(1, this.deps.concurrency ?? 4);
        let next = 0;
        const worker = async () => {
            while (!this.stopped && next < queue.length) {
                const file = queue[next++];
                const read: ReadRange = (offset, length) => this.deps.read(file, offset, Math.max(0, Math.min(length, file.byteLength - offset)));
                const { meta, failed } = await readMediaMetaChecked(file.name, file.byteLength, read);
                if (this.stopped) return;
                this.meta.set(file.id, this.toCached(meta));
                if (failed) this.provisional.add(file.id);
                else this.markDirty();
                this.rebuild();
                this.scheduleEmit();
            }
        };
        await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
    }

    /** A file that gave no date takes the date of its upload; one that could not be read takes it too, but is not kept, so that it is read again. */
    private async fillDatesFromUpload(): Promise<void> {
        const needing = this.media.filter((m) => this.meta.get(m.id)?.t === undefined);
        if (needing.length === 0) return;
        const times = await this.deps.uploadTimes().catch(() => new Map<string, number>());
        for (const file of needing) {
            const entry = this.meta.get(file.id) ?? {};
            this.meta.set(file.id, { ...entry, t: times.get(file.id) ?? 0, f: 1 });
            if (!this.provisional.has(file.id)) this.markDirty();
        }
    }

    private toCached(meta: MediaMeta): CachedMeta {
        const entry: CachedMeta = {};
        if (meta.takenAt !== undefined) entry.t = meta.takenAt;
        if (meta.width && meta.height) { entry.w = meta.width; entry.h = meta.height; }
        if (meta.duration !== undefined) entry.d = meta.duration;
        return entry;
    }

    private rebuild(): void {
        const items: MediaItem[] = [];
        let pending = 0;
        for (const file of this.media) {
            const entry = this.meta.get(file.id);
            if (!entry) { pending++; continue; }
            if (entry.t === undefined && !this.provisional.has(file.id) && this.meta.size < this.media.length) {
                // still waiting for the upload date of the files that gave none: it is not known yet where this one goes
                pending++;
                continue;
            }
            items.push({
                id: file.id,
                name: file.name,
                kind: mediaKind(file.name) ?? "photo",
                file,
                takenAt: entry.t ?? 0,
                dateFromUpload: entry.f === 1 || entry.t === undefined,
                width: entry.w,
                height: entry.h,
                duration: entry.d,
                aspect: entry.w && entry.h ? entry.w / entry.h : 4 / 3,
                thumbnail: this.thumbnails.get(file.id),
                preview: this.previews.get(file.id),
            });
        }
        this.current = { items: sortNewestFirst(pairLivePhotos(items)), total: this.media.length, pending };
    }

    private scheduleEmit(): void {
        if (this.emitTimer !== undefined || this.stopped) return;
        this.emitTimer = setTimeout(() => { this.emitTimer = undefined; this.emitNow(); }, this.deps.emitEveryMs ?? 250);
    }

    private emitNow(): void {
        if (this.stopped) return;
        for (const listener of this.listeners) listener(this.current);
    }

    private markDirty(): void {
        this.dirty = true;
        if (this.saveTimer !== undefined || this.stopped) return;
        this.saveTimer = setTimeout(() => { this.saveTimer = undefined; void this.saveNow(); }, this.deps.saveEveryMs ?? 2000);
    }

    private async saveNow(): Promise<void> {
        if (!this.dirty) return;
        this.dirty = false;
        const items: Record<string, CachedMeta> = {};
        for (const [id, entry] of this.meta) if (!this.provisional.has(id)) items[id] = entry;
        await this.deps.saveCache({ v: CACHE_VERSION, items }).catch(() => undefined);
    }
}
