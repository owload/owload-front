import { StateCreator } from "zustand";

export interface NewEditorFile {
    /** Full file name, with the extension. */
    name: string;
    /** Id of the editor extension that creates it. */
    extensionId: string;
}

export interface MediaPreviewSlice {
    mediaPreviewOpen: boolean;
    setMediaPreviewOpen: (open: boolean) => void;
    // The editor-extension window (owload-docs/decisions/0019): for the selected file, or for newEditorFile.
    editorOpen: boolean;
    setEditorOpen: (open: boolean) => void;
    // A document that is being created and is not in the drive yet: it is uploaded by the first Save.
    // null when the open document is an existing file.
    newEditorFile: NewEditorFile | null;
    setNewEditorFile: (file: NewEditorFile | null) => void;
}

export const createMediaPreviewSlice: StateCreator<MediaPreviewSlice, [], [], MediaPreviewSlice> = (set) => ({
    mediaPreviewOpen: false,
    setMediaPreviewOpen: (mediaPreviewOpen: boolean) => set({ mediaPreviewOpen }),
    editorOpen: false,
    setEditorOpen: (editorOpen: boolean) => set({ editorOpen }),
    newEditorFile: null,
    setNewEditorFile: (newEditorFile: NewEditorFile | null) => set({ newEditorFile }),
});
