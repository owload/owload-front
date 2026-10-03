import { DriveId, DriveInfo, RestDriveBackend } from "@/engine";
import { DriveStats } from "@/types/types";
import { StateCreator } from "zustand";

export interface DrivesSlice {
  drivesInitialized: boolean,
  passwordRetryFlag: boolean,
  setPasswordRetryFlag: (value: boolean) => void,
  drives: DriveInfo[],
  updateDrives: () => Promise<void>,
  driveStats: { [key: DriveId]: DriveStats };
  setDriveStats: (driveId: DriveId, driveStats: DriveStats) => void;
  removeDriveStats: (driveId: DriveId) => void;
  removeAllDrivesStats: () => void
}

export const createDirveStatsSlice: StateCreator<DrivesSlice, [], [], DrivesSlice> = (set) => ({
  drivesInitialized: false,
  passwordRetryFlag: false,
  setPasswordRetryFlag: (value: boolean) => set({ passwordRetryFlag: value }),
  drives: [] as DriveInfo[],
  updateDrives: async () => {
    const driveBackend = new RestDriveBackend();
    const drives = await driveBackend.getAccessibleDrives()
    drives.sort((a, b) => a.id <= b.id ? 1 : -1);      
    set({ drives, drivesInitialized: true });
  },
  driveStats: {},
  setDriveStats: (driveId: DriveId, driveStats: DriveStats) => set((state) => {
    const driveStatsCopy = structuredClone(state.driveStats);
    driveStatsCopy[driveId] = driveStats;
    return { driveStats: driveStatsCopy };
  }),
  removeDriveStats: (driveId: DriveId) => set((state) => {
    const driveStatsCopy = structuredClone(state.driveStats);
    delete driveStatsCopy[driveId];
    return { driveStats: driveStatsCopy };
  }),
  removeAllDrivesStats: () => {
    set({ driveStats: {} });
  }
});
