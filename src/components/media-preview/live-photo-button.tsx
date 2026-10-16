import { useEffect, useRef, useState } from "react";
import { CircleDot, Loader2 } from "lucide-react";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import type { FileProperties } from "@/types/types";
import { cn } from "@/lib/utils";
import { loadLiveVideo } from "./live-photo";

type State = "loading" | "ready" | "playing" | "unavailable";

/**
 * The "Live" button of a photo that has a short video saved with it: it plays the video over the photo, once and without sound, then the photo
 * is there again. The video is fetched as soon as the photo is open. Pressing it while it plays stops it. Where the browser cannot play the video
 * (an iPhone's are HEVC, which not every browser decodes) the button says so.
 */
export function LivePhotoButton({ photo }: { photo: FileProperties }) {
    const live = photo.live!;
    const { getFileData } = useFilesStoreOps();
    const [state, setState] = useState<State>("loading");
    const [url, setUrl] = useState<string | undefined>();
    const video = useRef<HTMLVideoElement | null>(null);
    const wantsToPlay = useRef(false);

    useEffect(() => {
        let aborted = false;
        setState("loading");
        setUrl(undefined);
        wantsToPlay.current = false;
        loadLiveVideo(live.id, () => getFileData(live))
            .then((address) => {
                if (aborted) return;
                setUrl(address);
                setState("ready");
            })
            .catch(() => { if (!aborted) setState("unavailable"); });
        return () => { aborted = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live.id]);

    // the video starts when the address is there and the button has been pressed
    useEffect(() => {
        if (state === "playing" && video.current) {
            video.current.currentTime = 0;
            void video.current.play().catch(() => setState("unavailable"));
        }
    }, [state]);

    function press() {
        if (state === "playing") {
            video.current?.pause();
            setState("ready");
        } else if (state === "ready") {
            setState("playing");
        } else if (state === "loading") {
            wantsToPlay.current = true; // plays as soon as it has arrived
        }
    }

    useEffect(() => {
        if (state === "ready" && wantsToPlay.current) {
            wantsToPlay.current = false;
            setState("playing");
        }
    }, [state]);

    const label = state === "unavailable" ? "Live is not available" : state === "playing" ? "Stop the live video" : "Play the live video";
    return (
        <>
            {url && (
                <video
                    ref={video}
                    src={url}
                    muted
                    playsInline
                    preload="auto"
                    onEnded={() => setState("ready")}
                    onError={() => setState("unavailable")}
                    className={cn("pointer-events-none absolute inset-0 z-[5] m-auto max-h-full max-w-full", state === "playing" ? "block" : "hidden")}
                />
            )}
            <button
                type="button"
                aria-label={label}
                aria-pressed={state === "playing"}
                title={label}
                disabled={state === "unavailable"}
                onClick={press}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className={cn(
                    "absolute left-4 top-4 z-10 flex h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold uppercase tracking-wide outline-sunny-yellow focus-visible:outline-2 disabled:cursor-default disabled:opacity-50",
                    state === "playing" ? "bg-sunny-yellow text-sunny-ink" : "bg-sunny-ink text-sunny-yellow hover:bg-sunny-ink-raised",
                )}
            >
                {state === "loading" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <CircleDot aria-hidden="true" className="size-4" strokeWidth={2.4} />}
                Live
            </button>
        </>
    );
}
