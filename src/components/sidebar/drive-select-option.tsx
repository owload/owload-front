import { DriveInfo } from "@/engine";
import { useGetDriveStats } from "@/hooks/use-get-drive-stats";
import { DriveIcon } from "../drives/drive-icon";
import { cn } from "@/lib/utils";

export function DriveSelectOption({ driveInfo }: { driveInfo: DriveInfo }) {
    const getDriveStats = useGetDriveStats();
    const driveStats = getDriveStats(driveInfo.id);
    const driveOpen = driveStats != null;
    const passwordIsWrong = driveOpen && driveStats?.description == null;

    return (
        <>
            <div className={cn("flex size-6 items-center justify-center rounded-sm border",
                {
                    "bg-gray-100": !driveOpen,
                    "bg-[#f5d9d0]": passwordIsWrong,
                    "bg-primary": driveOpen && !passwordIsWrong
                }
            )}>
                <DriveIcon driveInfo={driveInfo} className="size-4" />
            </div>
            {driveInfo.title}
        </>
    );
}