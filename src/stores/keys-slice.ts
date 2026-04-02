import { DriveId } from "@/engine";
import { StateCreator } from "zustand";

export interface KeysSlice {
    driveKeys: { [key: DriveId]: string },
    addDriveKey: (driveId: DriveId, keyExtracted: string) => void,
    removeDriveKey: (driveId: DriveId) => void,
    removeAllKeys: () => void
}

export const createKeysSlice: StateCreator<KeysSlice, [], [], KeysSlice> = (set) => ({
    driveKeys: {},
    addDriveKey: (driveId: DriveId, keyExtracted: string) => set((state) => {
        const driveKeysCopy = structuredClone(state.driveKeys);
        driveKeysCopy[driveId] = keyExtracted;
        return { driveKeys: driveKeysCopy };
    }),
    removeDriveKey: (driveId: DriveId) => set((state) => {
        const driveKeysCopy = structuredClone(state.driveKeys);
        delete driveKeysCopy[driveId];
        return { driveKeys: driveKeysCopy };
    }),
    removeAllKeys: () => set({ driveKeys: {} })
});
