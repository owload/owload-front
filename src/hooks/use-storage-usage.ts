import { useEffect } from "react";
import { useFilesStore } from "@/stores/files-store";
import { useStorageUsageStore } from "@/stores/storage-usage-store";
import type { StorageUsage } from "@/engine/backend/storage-usage-backend";

/**
 * What the drives the user owns take in Owload's storage and in their own S3, or undefined until the server has answered. It is asked for
 * when the component appears, when the list of drives is loaded again, and when an upload has finished; the store asks again a few times
 * while the server is still counting.
 */
export function useStorageUsage(): StorageUsage | undefined {
    const usage = useStorageUsageStore((state) => state.usage);
    const refresh = useStorageUsageStore((state) => state.refresh);
    const drives = useFilesStore((state) => state.drives);
    const finishedUploads = useFilesStore((state) => state.uploadQueue.filter((item) => item.status === "FINISHED").length);

    useEffect(() => {
        void refresh();
    }, [refresh, drives, finishedUploads]);

    return usage;
}
