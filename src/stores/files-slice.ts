import { DriveClient } from "@/engine";
import { FileProperties } from "@/types/types";
import { StateCreator } from "zustand";

const copy = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

export interface FilesSlice {
    fileObjects: FileProperties[];
    setFileObjects: (fileObjects: FileProperties[]) => void;
    setDriveClient: (driveClient: DriveClient) => void;
    lastSelectedId?: string; // used to select files with shift
    addSelected: (id: string) => void;
    addSelectedWithShift: (id: string) => void; // select all files between last selected and current
    removeSelected: (id: string) => void;
    removeSelectedWithShift: (id: string) => void; // deselect all files between last selected and current
    deselectAll: () => void;
    selectIds: (ids: string[]) => void;
    driveClient?: DriveClient;
    filesInitialized: Boolean;
    setFilesInitialized: (initialized: Boolean) => void;
    clearFiles: () => void;
}

export const createFilesSlice: StateCreator<FilesSlice, [], [], FilesSlice> = (set) => ({
    fileObjects: [],

    setFileObjects: (fileObjects: FileProperties[]) => set({ fileObjects }),

    setDriveClient: (driveClient: DriveClient) => set({ driveClient }),

    filesInitialized: false,

    setFilesInitialized: (filesInitialized: Boolean) => set({ filesInitialized }),

    addSelected: (id: string) => set(
        (state) => {
            const newFileObjects = copy(state.fileObjects);
            const fileObject = newFileObjects.find((fileObject: any) => fileObject.id === id);
            if (fileObject) {
                fileObject.selected = true;
            }
            return { fileObjects: newFileObjects, lastSelectedId: id };
        }
    ),

    addSelectedWithShift: (id: string) => set(
        (state) => {
            const newFileObjects = copy(state.fileObjects);
            const lastSelectedFileObjectIndex = newFileObjects.findIndex((fileObject: any) => fileObject.id === state.lastSelectedId);
            const curFileObjectIndex = newFileObjects.findIndex((fileObject: any) => fileObject.id === id);
            if (lastSelectedFileObjectIndex === -1 || curFileObjectIndex === -1) {
                return {};
            }
            const startIndex = Math.min(lastSelectedFileObjectIndex, curFileObjectIndex);
            const endIndex = Math.max(lastSelectedFileObjectIndex, curFileObjectIndex);
            for (let i = startIndex; i <= endIndex; i++) {
                newFileObjects[i].selected = true;
            }
            return { fileObjects: newFileObjects, lastSelectedId: id };
        }
    ),

    removeSelected: (id: string) => set(
        (state) => {
            const newFileObjects = copy(state.fileObjects);
            const fileObject = newFileObjects.find((fileObject: any) => fileObject.id === id);
            if (fileObject) {
                fileObject.selected = false;
            }
            return { fileObjects: newFileObjects, lastSelectedId: id };
        }
    ),

    removeSelectedWithShift: (id: string) => set(
        (state) => {
            const newFileObjects = copy(state.fileObjects);
            const lastSelectedFileObjectIndex = newFileObjects.findIndex((fileObject: any) => fileObject.id === state.lastSelectedId);
            const curFileObjectIndex = newFileObjects.findIndex((fileObject: any) => fileObject.id === id);
            if (lastSelectedFileObjectIndex === -1 || curFileObjectIndex === -1) {
                return {};
            }
            let startIndex, endIndex;
            if (lastSelectedFileObjectIndex < curFileObjectIndex) {
                startIndex = lastSelectedFileObjectIndex;
                endIndex = curFileObjectIndex - 1;
            } else {
                startIndex = curFileObjectIndex + 1;
                endIndex = lastSelectedFileObjectIndex;
            }
            for (let i = startIndex; i <= endIndex; i++) {
                newFileObjects[i].selected = false;
            }
            return { fileObjects: newFileObjects, lastSelectedId: id };
        }
    ),

    deselectAll: () => set(
        (state) => {
            const newFileObjects = copy(state.fileObjects);
            newFileObjects.forEach((fileObject: any) => {
                fileObject.selected = false;
            });
            return { fileObjects: newFileObjects, lastSelectedId: undefined };
        }
    ),

    selectIds(ids: string[]) {
        set((state) => {
            const newFileObjects = copy(state.fileObjects);
            newFileObjects.forEach((fileObject: any) => {
                fileObject.selected = ids.includes(fileObject.id);
            });
            return { fileObjects: newFileObjects, lastSelectedId: ids[ids.length - 1] };
        });
    },

    clearFiles: () => set({
        fileObjects: [],
        filesInitialized: false,
        driveClient: undefined
    })
});
