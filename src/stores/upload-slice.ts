import { UploadQueueItem } from "@/types/types";
import { StateCreator } from "zustand";

export interface UploadSlice {
    uploadQueue: UploadQueueItem[];
    setUploadQueue: (uploadQueue: UploadQueueItem[]) => void;
    uploadQueuePromise?: Promise<void>,
    setUploadQueuePromise: (uploadQueuePromise: Promise<void> | undefined) => void;
}

export const createUploadSlice: StateCreator<UploadSlice, [], [], UploadSlice> = (set) => ({
    uploadQueue: [],
    setUploadQueue: (uploadQueue: UploadQueueItem[]) => set({ uploadQueue }),
    uploadQueuePromise: undefined,
    setUploadQueuePromise: (uploadQueuePromise: Promise<void> | undefined) => set({ uploadQueuePromise })
});