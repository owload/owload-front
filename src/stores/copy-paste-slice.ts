import { StateCreator } from "zustand";

export type MoveOrCopy = "MOVE" | "COPY";
export interface CopyPasteSlice {
    filesToMoveOrCopy: { pathSrc: string; fileNames: string[] } | null;
    operationType: MoveOrCopy | null,
    setFilesToCopy: (pathSrc: string, fileNames: string[]) => void;
    clearFilesToMoveOrCopy: () => void;
    setFilesToMove: (pathSrc: string, fileNames: string[]) => void;
    dragHappening: boolean,
    setDragHappening: (v: boolean) => void
}

export const createCopyPasteSlice: StateCreator<CopyPasteSlice, [], [], CopyPasteSlice> = (set) => ({
    filesToMoveOrCopy: null,
    operationType: null,
    setFilesToCopy: (pathSrc, fileNames) =>
        set({ filesToMoveOrCopy: { pathSrc, fileNames }, operationType: "COPY" }),
    setFilesToMove: (pathSrc, fileNames) =>
        set({ filesToMoveOrCopy: { pathSrc, fileNames }, operationType: "MOVE" }),
    clearFilesToMoveOrCopy: () => set({ filesToMoveOrCopy: null, operationType: null }),
    dragHappening: false,
    setDragHappening: (dragHappening: boolean) => set({dragHappening})
});
