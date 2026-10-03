import { ReactNode, useEffect, useRef, useState } from "react";

type DebouncedSkeletonProps = {
    initializedComponent: ReactNode,
    skeletonComponent: ReactNode,
    contentInitialized: boolean
}

export function DebouncedSkeleton({ initializedComponent, skeletonComponent, contentInitialized }: DebouncedSkeletonProps) {
    const debounceTime = 100; // milliseconds
    const minExposureTime = 140;
    const [showSkeleton, setShowSkeleton] = useState(false);
    const [showContentAvailable, setShowContentAvailable] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const contentInitializedRef = useRef<boolean>(contentInitialized);

    useEffect(() => {
        contentInitializedRef.current = contentInitialized;
        if (contentInitialized) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (showContentAvailable) {
                setShowSkeleton(false);
            }
        } else {
            if (!timeoutRef.current) {
                timeoutRef.current = setTimeout(() => {
                    setShowSkeleton(true);
                    setShowContentAvailable(false);
                    setTimeout(() => { setShowContentAvailable(true); if (contentInitializedRef.current) { setShowSkeleton(false); } }, minExposureTime);
                }, debounceTime);
            }
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [contentInitialized]);

    if (showSkeleton) {
        return skeletonComponent;
    } else if (contentInitialized) {
        return initializedComponent;
    } else {
        return <></>;
    }
}