import { ProgressInfo } from "@/engine";
import { useFilesStore } from "@/stores/files-store";
import { UploadQueueItem } from "@/types/types";

// Calculate individual item transfer progress percentage across main part and previews
export function calculateItemTransferProgressInfo(uploadItem: UploadQueueItem): ProgressInfo {
    const totalProgress: ProgressInfo = { encrypted: 0, transferred: 0, total: 0 };
    for (let key in uploadItem.progressInfo) {
        totalProgress.encrypted += uploadItem.progressInfo[key].encrypted;
        totalProgress.transferred += uploadItem.progressInfo[key].transferred;
        totalProgress.total += uploadItem.progressInfo[key].total;
    }
    return totalProgress;
}

// Calculate total transfer progress percentage across all upload queue items
export function useTotalTransferProgress() {
    const uploadQueue = useFilesStore((state) => state.uploadQueue);
    return () => {
        const totalSize = filterLastProgressThresholdItems(uploadQueue).reduce((previousValue: number, currentItem: UploadQueueItem) => {
            for (let key in currentItem.progressInfo) {
                previousValue += currentItem.progressInfo[key].total;
            }
            return previousValue;
        }, 0);
        const totalTransferred = filterLastProgressThresholdItems(uploadQueue).reduce((previousValue: number, currentItem: UploadQueueItem) => {
            for (let key in currentItem.progressInfo) {
                previousValue += currentItem.status === "CANCELLED" ? currentItem.progressInfo[key].total : currentItem.progressInfo[key].transferred;
            }
            return previousValue;
        }, 0);
        return Math.floor(totalTransferred / totalSize * 100) || 0;
    }
}

export function filterLastProgressThresholdItems(uploadQueue: UploadQueueItem[]): UploadQueueItem[] {
    let lastThresholdIndex = uploadQueue.findIndex(item => item.progressThreshold);
    if (lastThresholdIndex === -1) {
        return uploadQueue;
    }
    return uploadQueue.slice(0, lastThresholdIndex);
}

export function useIsAllTransferFinished() {
    const uploadQueue = useFilesStore((state) => state.uploadQueue);
    return uploadQueue.reduce((previousValue: boolean, currentItem: UploadQueueItem) => {
        return previousValue && currentItem.status !== "QUEUED" && currentItem.status !== "PROGRESS";
    }, true);
}
