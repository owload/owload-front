import { memo, useEffect, useState } from "react";
import { CircleDot, Film, Image as ImageIcon, Play } from "lucide-react";
import type { DriveClient } from "@/engine";
import { cn } from "@/lib/utils";
import { formatDuration } from "./media-format";
import type { MediaItem } from "./media-library";
import { loadThumbnail, NotWantedAnymore } from "./media-thumbnails";

interface Props {
    item: MediaItem;
    driveClient: DriveClient;
    width: number;
    height: number;
    left: number;
    onOpen: (id: string) => void;
}

/** One picture of the mosaic: its small picture when it has arrived, a quiet colour before that, a play mark and the length for a video. */
export const MediaTile = memo(function MediaTile({ item, driveClient, width, height, left, onOpen }: Props) {
    const [url, setUrl] = useState<string | undefined>();
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let wanted = true;
        setUrl(undefined);
        setFailed(false);
        loadThumbnail(driveClient, item, () => wanted)
            .then((address) => { if (wanted) { setUrl(address); setFailed(address === undefined); } })
            .catch((error) => { if (wanted && !(error instanceof NotWantedAnymore)) setFailed(true); });
        return () => { wanted = false; };
    }, [driveClient, item.id, item.thumbnail?.id]);

    const Icon = item.kind === "video" ? Film : ImageIcon;
    return (
        <button
            type="button"
            onClick={() => onOpen(item.id)}
            aria-label={`${item.kind === "video" ? "Video" : "Photo"} ${item.name}`}
            title={item.name}
            style={{ left, width, height }}
            className="group absolute top-0 cursor-pointer overflow-hidden rounded-[10px] bg-sunny-field outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2"
        >
            {url ? (
                <img src={url} alt="" draggable={false} className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            ) : (
                <span aria-hidden="true" className={cn("absolute inset-0 flex items-center justify-center text-sunny-line-strong", !failed && "animate-pulse")}>
                    {failed && <Icon className="size-7" strokeWidth={1.6} />}
                </span>
            )}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            {item.live && (
                <span title="Live Photo" className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    <CircleDot aria-hidden="true" className="size-3" strokeWidth={2.4} />
                    Live
                </span>
            )}
            {item.kind === "video" && (
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 py-0.5 pl-1.5 pr-2 text-[11px] font-semibold text-white">
                    <Play aria-hidden="true" className="size-3 fill-current" />
                    {item.duration !== undefined ? formatDuration(item.duration) : "Video"}
                </span>
            )}
        </button>
    );
});
