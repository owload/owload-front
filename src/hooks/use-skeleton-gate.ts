import { useEffect, useRef, useState } from "react";
import { DelayedFlag } from "@/lib/delayed-flag";

/** How long loading must last before a skeleton is drawn: a shorter load shows the content at once and no skeleton. */
export const SKELETON_DELAY_MS = 250;
/** How long a skeleton that has been drawn stays, so that it does not blink away. */
export const SKELETON_MIN_SHOW_MS = 400;

export function useDelayedFlag(loading: boolean, delayMs: number, minShowMs: number): boolean {
    const [shown, setShown] = useState(false);
    const flag = useRef<DelayedFlag | undefined>(undefined);
    flag.current ??= new DelayedFlag(setShown, delayMs, minShowMs);
    useEffect(() => {
        flag.current?.setLoading(loading);
    }, [loading]);
    useEffect(() => () => flag.current?.dispose(), []);
    return shown;
}

/**
 * For a component that has its content and its skeleton in different branches (and returns early): what to draw now. "skeleton": loading
 * has gone on long enough (or the skeleton is still within its minimum time); "content": it has loaded; "waiting": loading, but not long
 * enough yet to draw anything, where the skeleton's room should be kept (invisibly) so that nothing jumps.
 * Call it before any early return, so that it stays mounted when the content arrives.
 */
export function useSkeletonGate(loading: boolean): "skeleton" | "content" | "waiting" {
    const shown = useDelayedFlag(loading, SKELETON_DELAY_MS, SKELETON_MIN_SHOW_MS);
    if (shown) return "skeleton";
    return loading ? "waiting" : "content";
}
