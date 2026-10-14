import { ReactNode, useEffect, useRef, useState } from "react";
import { DelayedFlag } from "@/lib/delayed-flag";

/** How long loading must last before a skeleton is drawn: a shorter load shows the content at once and no skeleton. */
const SKELETON_DELAY_MS = 250;
/** How long a skeleton that has been drawn stays, so that it does not blink away. */
const SKELETON_MIN_SHOW_MS = 400;

function useDelayedFlag(loading: boolean, delayMs: number, minShowMs: number): boolean {
    const [shown, setShown] = useState(false);
    const flag = useRef<DelayedFlag | undefined>(undefined);
    flag.current ??= new DelayedFlag(setShown, delayMs, minShowMs);
    useEffect(() => {
        flag.current?.setLoading(loading);
    }, [loading]);
    useEffect(() => () => flag.current?.dispose(), []);
    return shown;
}

type DebouncedSkeletonProps = {
    initializedComponent: ReactNode,
    skeletonComponent: ReactNode,
    contentInitialized: boolean
}

/**
 * The content when it is ready; a skeleton only if getting it takes long enough to be noticed (and then for long enough to be seen);
 * nothing in between, so there is neither a blink of a skeleton before quick content nor a blank that stays.
 */
export function DebouncedSkeleton({ initializedComponent, skeletonComponent, contentInitialized }: DebouncedSkeletonProps) {
    const showSkeleton = useDelayedFlag(!contentInitialized, SKELETON_DELAY_MS, SKELETON_MIN_SHOW_MS);
    if (showSkeleton) {
        return skeletonComponent;
    }
    if (contentInitialized) {
        // content is ready, but a skeleton that has been drawn is still within its minimum time: it is then shown by the branch above
        return initializedComponent;
    }
    return <></>;
}
