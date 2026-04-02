import { StateCreator } from "zustand";

export interface MediaPreviewSlice {
    mediaPreviewOpen: boolean;
    setMediaPreviewOpen: (open: boolean) => void;
}

export const createMediaPreviewSlice: StateCreator<MediaPreviewSlice, [], [], MediaPreviewSlice> = (set) => ({
    mediaPreviewOpen: false,
    setMediaPreviewOpen: (mediaPreviewOpen: boolean) => set({ mediaPreviewOpen })
});

