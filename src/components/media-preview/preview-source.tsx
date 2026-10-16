import { createContext, useContext } from "react";
import { getPreviewFileName } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import type { FileProperties } from "@/types/types";

/** Finds the small picture (of the given size) that goes with a file, if the drive has one. */
export type PreviewFileFinder = (fileId: string, size: number) => FileProperties | undefined;

/**
 * Where the media preview gets the files it pages through. Inside a folder it is that folder (the default). The media section shows
 * photos from every folder and gives its own list, its own way to move and to close, and its own way to find the small pictures.
 */
export interface MediaViewerSource {
    files: FileProperties[];
    currentId: string;
    onNavigate: (id: string) => void;
    onClose: () => void;
    findPreview: PreviewFileFinder;
}

const PreviewFinderContext = createContext<PreviewFileFinder | null>(null);
export const PreviewFinderProvider = PreviewFinderContext.Provider;

/** The finder of the media preview that is open: the media section's, or else one that looks in the current folder. */
export function usePreviewFileFinder(): PreviewFileFinder {
    const custom = useContext(PreviewFinderContext);
    const fileObjects = useFilesStore((state) => state.fileObjects);
    return custom ?? ((fileId, size) => {
        const name = getPreviewFileName(fileId, size);
        return fileObjects.find((f) => f.name === name);
    });
}
