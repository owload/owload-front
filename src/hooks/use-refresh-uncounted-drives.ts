import { useEffect } from "react";
import { useFilesStore } from "@/stores/files-store";

const RECHECK_AFTER_MS = 3000;
const MAX_RECHECKS = 6;

/**
 * The server counts the size of a drive in the background when it has not done so lately, so some drives may come without a size at
 * first. While any is missing, the list of drives is asked for again a few times (the cards show "…" until then).
 */
export function useRefreshUncountedDrives(): void {
    const drives = useFilesStore((state) => state.drives);
    const updateDrives = useFilesStore((state) => state.updateDrives);
    const uncounted = drives.some((drive) => drive.storedBytes == null);

    useEffect(() => {
        if (!uncounted) return;
        let tries = 0;
        const timer = setInterval(() => {
            if (++tries > MAX_RECHECKS) {
                clearInterval(timer);
                return;
            }
            void updateDrives().catch(() => undefined);
        }, RECHECK_AFTER_MS);
        return () => clearInterval(timer);
    }, [uncounted, updateDrives]);
}
