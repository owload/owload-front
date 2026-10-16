import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlay } from "lucide-react";
import { FsObjectType } from "@/engine";
import { cn } from "@/lib/utils";
import { useFilesStore } from "@/stores/files-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGetCurrentDriveStats } from "@/hooks/use-get-current-drive-stats";
import { DebouncedSkeleton } from "@/components/ui/debounced-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { WrongPasswordFilesArea } from "@/components/files-area/wrong-password-files-area";
import { MediaPreview } from "@/components/media-preview/media-preview";
import type { MediaViewerSource } from "@/components/media-preview/preview-source";
import type { FileProperties } from "@/types/types";
import { useMediaLibrary } from "@/features/media/use-media-library";
import { blocksInView, buildSections, layoutSections, TILE_SIZES, type GroupBy, type TileSize } from "@/features/media/media-layout";
import { MediaTile } from "@/features/media/media-tile";
import { clearThumbnails } from "@/features/media/media-thumbnails";
import { describeCounts } from "@/features/media/media-format";
import type { MediaItem } from "@/features/media/media-library";

type Filter = "all" | "photo" | "video";
const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
    { value: "all", label: "All" },
    { value: "photo", label: "Photos" },
    { value: "video", label: "Videos" },
];
const SIZES: ReadonlyArray<{ value: TileSize; label: string; name: string }> = [
    { value: "small", label: "S", name: "Small tiles" },
    { value: "medium", label: "M", name: "Medium tiles" },
    { value: "large", label: "L", name: "Large tiles" },
];
const GROUPS: ReadonlyArray<{ value: GroupBy; label: string; name: string }> = [
    { value: "auto", label: "Auto", name: "Recent days, older months" },
    { value: "day", label: "Days", name: "By day" },
    { value: "month", label: "Months", name: "By month" },
];
const SIZE_KEY = "owload.mediaTileSize";
const GROUP_KEY = "owload.mediaGroupBy";
const HEADER_HEIGHT = 52;
const SECTION_GAP = 14;
/** How far outside the window tiles are still drawn (and their pictures fetched), so that scrolling does not show empty places. */
const OVERSCAN = 700;
const PREVIEW_SIZE = 1024;

function loadSize(): TileSize {
    try {
        const stored = localStorage.getItem(SIZE_KEY);
        if (stored === "small" || stored === "medium" || stored === "large") return stored;
    } catch {
        // storage may be blocked
    }
    return "medium";
}

function loadGroup(): GroupBy {
    try {
        const stored = localStorage.getItem(GROUP_KEY);
        if (stored === "auto" || stored === "day" || stored === "month") return stored;
    } catch {
        // storage may be blocked
    }
    return "auto";
}

function fileProperties(file: { id: string; name: string; byteOffset: number; byteLength: number }): FileProperties {
    const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
    return { id: file.id, type: FsObjectType.FILE, name: file.name, extension, byteOffset: file.byteOffset, byteLength: file.byteLength, finished: true };
}

function toFileProperties(item: MediaItem): FileProperties {
    return { ...fileProperties(item.file), live: item.live ? fileProperties(item.live) : undefined };
}

function segmentClass(active: boolean) {
    return cn(
        "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2",
        active ? "bg-sunny-ink text-sunny-yellow" : "text-sunny-ink hover:bg-sunny-ink/10",
    );
}

function MediaSkeleton() {
    const rows = [[0.3, 0.4, 0.3], [0.4, 0.3, 0.3], [0.28, 0.28, 0.44]];
    return (
        <div role="status" aria-label="Loading media" className="flex flex-col gap-1 px-4 pt-3 md:px-7">
            {rows.map((widths, i) => (
                <div key={i} className="flex gap-1">
                    {widths.map((w, j) => <Skeleton key={j} className="h-40 rounded-[10px] sm:h-52" style={{ width: `${w * 100}%` }} />)}
                </div>
            ))}
        </div>
    );
}

/** All the photos and videos of the open drive, from every folder, the newest first by the day they were taken, as a mosaic of tiles of different sizes. */
export function MediaPage() {
    const driveClient = useFilesStore((state) => state.driveClient);
    const filesInitialized = useFilesStore((state) => state.filesInitialized);
    const driveStats = useGetCurrentDriveStats()();
    const isMobile = useIsMobile();
    const { snapshot, ready } = useMediaLibrary();

    const [filter, setFilter] = useState<Filter>("all");
    const [size, setSizeState] = useState<TileSize>(loadSize);
    const [groupBy, setGroupByState] = useState<GroupBy>(loadGroup);
    const [viewerId, setViewerId] = useState<string | undefined>();
    const [scroll, setScroll] = useState({ top: 0, height: 800 });
    const [width, setWidth] = useState(0);
    const scroller = useRef<HTMLDivElement | null>(null);

    const setSize = (next: TileSize) => {
        setSizeState(next);
        try { localStorage.setItem(SIZE_KEY, next); } catch { /* storage may be blocked */ }
    };

    const setGroupBy = (next: GroupBy) => {
        setGroupByState(next);
        try { localStorage.setItem(GROUP_KEY, next); } catch { /* storage may be blocked */ }
    };

    useEffect(() => () => clearThumbnails(), []);

    // the width the mosaic can use, and the window that is looked through
    const measure = useCallback(() => {
        const element = scroller.current;
        if (!element) return;
        const padding = element.clientWidth < 768 ? 32 : 56;
        setWidth(Math.max(0, element.clientWidth - padding));
        setScroll((current) => ({ top: current.top, height: element.clientHeight }));
    }, []);
    useEffect(() => {
        const element = scroller.current;
        if (!element) return;
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [measure, ready, filesInitialized]);

    const frame = useRef<number | null>(null);
    const onScroll = () => {
        if (frame.current !== null) return;
        frame.current = requestAnimationFrame(() => {
            frame.current = null;
            const element = scroller.current;
            if (element) setScroll({ top: element.scrollTop, height: element.clientHeight });
        });
    };

    const photos = useMemo(() => snapshot.items.filter((item) => item.kind === "photo").length, [snapshot.items]);
    const videos = snapshot.items.length - photos;
    const items = useMemo(() => (filter === "all" ? snapshot.items : snapshot.items.filter((item) => item.kind === filter)), [snapshot.items, filter]);
    const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

    const targetHeight = TILE_SIZES[size] * (isMobile ? 0.62 : 1);
    const layout = useMemo(
        () => layoutSections(buildSections(items.map((i) => ({ id: i.id, aspect: i.aspect, takenAt: i.takenAt })), Date.now(), groupBy), { width, targetHeight, gap: isMobile ? 3 : 4, headerHeight: HEADER_HEIGHT, sectionGap: SECTION_GAP }),
        [items, width, targetHeight, isMobile, groupBy],
    );
    const visible = useMemo(() => blocksInView(layout, scroll.top - OVERSCAN, scroll.top + scroll.height + OVERSCAN), [layout, scroll]);

    const source = useMemo<MediaViewerSource | undefined>(() => {
        if (viewerId === undefined) return undefined;
        const files = items.map(toFileProperties);
        const previews = new Map(items.filter((i) => i.preview).map((i) => [i.id, { ...toFileProperties(i), id: i.preview!.id, name: i.preview!.name, byteOffset: i.preview!.byteOffset, byteLength: i.preview!.byteLength } as FileProperties]));
        return {
            files,
            currentId: viewerId,
            onNavigate: setViewerId,
            onClose: () => setViewerId(undefined),
            findPreview: (fileId, previewSize) => (previewSize === PREVIEW_SIZE ? previews.get(fileId) : undefined),
        };
    }, [viewerId, items]);

    if (filesInitialized && !driveStats?.description) {
        return <div className="absolute inset-x-0 bottom-0 top-18"><WrongPasswordFilesArea /></div>;
    }

    const loaded = ready && (snapshot.items.length > 0 || snapshot.pending === 0);
    const reading = snapshot.pending > 0 ? snapshot.total - snapshot.pending : undefined;

    return (
        <div className="absolute inset-x-0 bottom-0 top-18 flex flex-col">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-2 pt-4 md:px-7">
                <div className="flex min-w-0 flex-col">
                    <h1 className="m-0 flex items-center gap-2 text-[22px] font-semibold leading-tight text-sunny-ink">
                        <ImagePlay aria-hidden="true" className="size-5" strokeWidth={2.2} />
                        Media
                    </h1>
                    <span className="text-[13px] text-sunny-muted" aria-live="polite">
                        {loaded ? describeCounts(photos, videos) : "Looking for your photos and videos…"}
                        {reading !== undefined && ` · reading dates ${reading.toLocaleString("en-US")} of ${snapshot.total.toLocaleString("en-US")}`}
                    </span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                    <div role="group" aria-label="Show" className="flex items-center rounded-full bg-sunny-field p-0.5">
                        {FILTERS.map((f) => (
                            <button key={f.value} type="button" aria-pressed={filter === f.value} className={segmentClass(filter === f.value)} onClick={() => setFilter(f.value)}>{f.label}</button>
                        ))}
                    </div>
                    <div role="group" aria-label="Group by" className="flex items-center rounded-full bg-sunny-field p-0.5">
                        {GROUPS.map((g) => (
                            <button key={g.value} type="button" aria-label={g.name} aria-pressed={groupBy === g.value} className={segmentClass(groupBy === g.value)} onClick={() => setGroupBy(g.value)}>{g.label}</button>
                        ))}
                    </div>
                    <div role="group" aria-label="Tile size" className="flex items-center rounded-full bg-sunny-field p-0.5">
                        {SIZES.map((s) => (
                            <button key={s.value} type="button" aria-label={s.name} aria-pressed={size === s.value} className={segmentClass(size === s.value)} onClick={() => setSize(s.value)}>{s.label}</button>
                        ))}
                    </div>
                </div>
            </div>
            {reading !== undefined && snapshot.total > 0 && (
                <div aria-hidden="true" className="mx-4 h-0.5 overflow-hidden rounded-full bg-sunny-line md:mx-7">
                    <div className="h-full rounded-full bg-sunny-ink transition-[width] duration-300" style={{ width: `${(reading / snapshot.total) * 100}%` }} />
                </div>
            )}

            <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <DebouncedSkeleton
                    contentInitialized={loaded}
                    skeletonComponent={<MediaSkeleton />}
                    initializedComponent={
                        items.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sunny-muted">
                                <ImagePlay aria-hidden="true" className="size-10 text-sunny-line-strong" strokeWidth={1.5} />
                                <p className="m-0 text-base font-semibold text-sunny-ink">{snapshot.total === 0 ? "No photos or videos yet" : "Nothing of this kind"}</p>
                                <p className="m-0 max-w-sm text-sm">{snapshot.total === 0 ? "Upload photos and videos to this drive and they will appear here, the newest first." : "Pick another kind above."}</p>
                            </div>
                        ) : (
                            <div className="relative mx-auto" style={{ width, height: layout.height + 96 }}>
                                {visible.map((block) => block.type === "header" ? (
                                    <h2 key={`h${block.sectionKey}`} className="absolute inset-x-0 m-0 flex items-end gap-2 pb-2 text-[15px] font-semibold text-sunny-ink" style={{ top: block.top, height: block.height }}>
                                        {block.label}
                                        <span className="pb-px text-xs font-normal text-sunny-muted">{block.count}</span>
                                    </h2>
                                ) : (
                                    <div key={`r${block.sectionKey}-${block.tiles[0]?.id}`} className="absolute inset-x-0" style={{ top: block.top, height: block.height }}>
                                        {block.tiles.map((tile) => {
                                            const item = byId.get(tile.id);
                                            return item && driveClient ? (
                                                <MediaTile key={tile.id} item={item} driveClient={driveClient} left={tile.left} width={tile.width} height={tile.height} onOpen={setViewerId} />
                                            ) : null;
                                        })}
                                    </div>
                                ))}
                            </div>
                        )
                    }
                />
            </div>
            {source && <MediaPreview source={source} />}
        </div>
    );
}
