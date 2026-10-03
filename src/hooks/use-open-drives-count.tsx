import { useFilesStore } from "@/stores/files-store";

export function useOpenDrivesCount() {
    return function getOpenDrivesCount() {
        return useFilesStore((state) => Object.keys(state.driveKeys).length);
    }
}