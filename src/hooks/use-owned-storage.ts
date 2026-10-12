import { useEffect } from "react";
import { useFilesStore } from "@/stores/files-store";
import { ownedStorage, type OwnedStorage } from "@/lib/owned-storage";

const RECHECK_AFTER_MS = 3000;
const MAX_RECHECKS = 6;
let rechecks = 0;

/**
 * How much space the drives owned by the user take, or undefined until the list of drives has been loaded. The server counts the blocks
 * of a drive in the background when it has not done so lately, so some drives may come without a number at first: the list is asked
 * for again a few times, and the sum says it is not complete until they are all there.
 */
export function useOwnedStorage(): OwnedStorage | undefined {
    const drives = useFilesStore((state) => state.drives);
    const loaded = useFilesStore((state) => state.drivesInitialized);
    const updateDrives = useFilesStore((state) => state.updateDrives);
    const uncounted = loaded && drives.some((drive) => drive.storedBytes == null);

    useEffect(() => {
        if (!uncounted) {
            rechecks = 0;
            return;
        }
        if (rechecks >= MAX_RECHECKS) return;
        const timer = setTimeout(() => {
            rechecks++;
            void updateDrives().catch(() => undefined);
        }, RECHECK_AFTER_MS);
        return () => clearTimeout(timer);
    }, [uncounted, drives, updateDrives]);

    return loaded ? ownedStorage(drives) : undefined;
}
