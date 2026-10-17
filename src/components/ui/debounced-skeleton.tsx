import { ReactNode } from "react";
import { useDelayedFlag, SKELETON_DELAY_MS, SKELETON_MIN_SHOW_MS } from "@/hooks/use-skeleton-gate";

type DebouncedSkeletonProps = {
    initializedComponent: ReactNode,
    skeletonComponent: ReactNode,
    contentInitialized: boolean,
    /** While nothing is drawn yet, keep the room the skeleton takes (invisible), so that the content does not push what is below it down when it arrives. */
    reserveSpace?: boolean
}

/**
 * The content when it is ready; a skeleton only if getting it takes long enough to be noticed (and then for long enough to be seen);
 * nothing in between, so there is neither a blink of a skeleton before quick content nor a blank that stays.
 */
export function DebouncedSkeleton({ initializedComponent, skeletonComponent, contentInitialized, reserveSpace }: DebouncedSkeletonProps) {
    const showSkeleton = useDelayedFlag(!contentInitialized, SKELETON_DELAY_MS, SKELETON_MIN_SHOW_MS);
    if (showSkeleton) {
        return skeletonComponent;
    }
    if (contentInitialized) {
        // content is ready, but a skeleton that has been drawn is still within its minimum time: it is then shown by the branch above
        return initializedComponent;
    }
    return reserveSpace ? <div aria-hidden="true" className="invisible">{skeletonComponent}</div> : <></>;
}
