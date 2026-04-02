import { DriveId } from "@/engine";
import { useFilesStore } from "@/stores/files-store";

export function useGetDriveStats() {
    const driveStats = useFilesStore((state) => state.driveStats);
    
    return function (driveId: DriveId) {
        return driveStats[driveId];
    }
}