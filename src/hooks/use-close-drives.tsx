import { DriveId } from "@/engine";
import { useFilesStore } from "@/stores/files-store";

export function useCloseAllDrives() {
  const removeAllKeys = useFilesStore((state) => state.removeAllKeys);
  const removeAllDrivesStats = useFilesStore((state) => state.removeAllDrivesStats);
  return function closeAllDrives() {
    removeAllDrivesStats();
    removeAllKeys();
  };
}

export function useCloseDrive() {
  const removeDriveKey = useFilesStore((state) => state.removeDriveKey);
  const removeDriveStats = useFilesStore((state) => state.removeDriveStats);
  const clearFiles = useFilesStore((state) => state.clearFiles);
  return function closeAllDrives(driveId: DriveId) {
    removeDriveStats(driveId);
    removeDriveKey(driveId);
    clearFiles();
  };
}

export function useCloseCurrentDrive() {
  const closeDrive = useCloseDrive();
  return function closeCurrentDrive() {
    const currentDriveId = useFilesStore.getState().driveClient?.getDriveId();
    if (currentDriveId) {
      closeDrive(currentDriveId);
    }
  }
}