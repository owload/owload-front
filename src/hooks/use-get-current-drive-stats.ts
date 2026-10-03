import { useFilesStore } from "@/stores/files-store";

export function useGetCurrentDriveStats() {
    const driveClient = useFilesStore((state) => state.driveClient);
    const driveStats = useFilesStore((state) => state.driveStats);
    
    return function () {
        if(!driveClient || !driveClient.getDriveId() || !driveStats) {
            return null;
        }
        const driveId = driveClient.getDriveId();
        return driveStats[driveId];
    }
}