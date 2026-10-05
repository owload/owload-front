import { DriveInfo } from "@/engine";
import { useNavigate } from "react-router-dom";
import { useGetDriveStats } from "@/hooks/use-get-drive-stats";
import { useCloseDrive } from "@/hooks/use-close-drives";

/** What a drive card shows and does; shared by the card of an open drive and the row of a closed one. */
export function useDriveActions(driveInfo: DriveInfo) {
    const navigate = useNavigate();
    const getDriveStats = useGetDriveStats();
    const closeDrive = useCloseDrive();
    const driveStats = getDriveStats(driveInfo.id);
    const driveOpen = driveStats != null;
    // the password was wrong: the drive is "open" with a key that decrypts nothing
    const passwordIsWrong = driveOpen && driveStats?.description == null;
    const openDriveUrl = `/drive/${driveInfo.id}`;

    return {
        driveOpen,
        passwordIsWrong,
        description: driveStats?.description,
        browse: () => navigate(openDriveUrl),
        close: () => closeDrive(driveInfo.id),
        // closing forgets the wrong key, so that opening the drive asks for the password again
        tryAgain: () => { closeDrive(driveInfo.id); navigate(openDriveUrl); },
        settings: () => navigate(`/drive/${driveInfo.id}/settings`),
        logs: () => navigate(`${openDriveUrl}/logs`),
    };
}
