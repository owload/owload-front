import { StateCreator } from "zustand";

export interface MediaPreviewSlice {
    mediaPreviewOpen: boolean;
    setMediaPreviewOpen: (open: boolean) => void;
    textEditorOpen: boolean;
    setTextEditorOpen: (open: boolean) => void;
    spreadsheetEditorOpen: boolean;
    setSpreadsheetEditorOpen: (open: boolean) => void;
    // Name of a spreadsheet that is being created and is not in the drive yet:
    // it is uploaded by the first Save. null when the open spreadsheet is an existing file.
    newSpreadsheetName: string | null;
    setNewSpreadsheetName: (name: string | null) => void;
}

export const createMediaPreviewSlice: StateCreator<MediaPreviewSlice, [], [], MediaPreviewSlice> = (set) => ({
    mediaPreviewOpen: false,
    setMediaPreviewOpen: (mediaPreviewOpen: boolean) => set({ mediaPreviewOpen }),
    textEditorOpen: false,
    setTextEditorOpen: (textEditorOpen: boolean) => set({ textEditorOpen }),
    spreadsheetEditorOpen: false,
    setSpreadsheetEditorOpen: (spreadsheetEditorOpen: boolean) => set({ spreadsheetEditorOpen }),
    newSpreadsheetName: null,
    setNewSpreadsheetName: (newSpreadsheetName: string | null) => set({ newSpreadsheetName }),
});

