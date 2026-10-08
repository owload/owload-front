import { useParams } from "react-router-dom";
import { useFilesStore } from "@/stores/files-store";

/**
 * Whether the signed-in user may add and change files on the drive that is open. A reader may only view it. Until the list of the
 * drives has arrived it is assumed they may: the backend refuses what the role does not allow, this only keeps the buttons that
 * cannot work out of sight.
 */
export function useCanWrite(): boolean {
    const { driveId } = useParams();
    const viewingPublicDrive = useFilesStore((state) => state.publicToken !== undefined);
    const role = useFilesStore((state) => state.drives.find((drive) => drive.id === driveId)?.myRole);
    return !viewingPublicDrive && (role === undefined || role !== "reader");
}
