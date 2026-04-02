import { DriveInfo } from "@/engine";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { EyeOff, Folder, FolderOpen, FolderX } from "lucide-react";
import { useGetDriveStats } from "@/hooks/use-get-drive-stats";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useState } from "react";
import { useCloseDrive } from "@/hooks/use-close-drives";
import { DriveIcon } from "./drive-icon";

export function DriveBlock({ driveInfo }: { driveInfo: DriveInfo }) {
    const navigate = useNavigate();
    const getDriveStats = useGetDriveStats();
    const closeDrive = useCloseDrive();
    // helps to prevent button quick switch before navigating to try-new-password page
    const [readyToTryNewPassword, setReadyToTryNewPassword] = useState(false);
    const driveStats = getDriveStats(driveInfo.id);
    const driveOpen = driveStats != null;
    const passwordIsWrong = driveOpen && driveStats?.description == null;

    const openDriveUrl = `/drive/${driveInfo.id}`;

    function handleCloseClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        event.preventDefault();
        closeDrive(driveInfo.id);
    }

    function handleTryAgainClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        event.preventDefault();
        setReadyToTryNewPassword(true);
        closeDrive(driveInfo.id);
        navigate(openDriveUrl);
    }

    function handleSettingsClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        event.preventDefault();
        
    }

    return (

        <Link to={openDriveUrl}>
            <div className={cn(
                "rounded-md p-5 w-full md:w-100 relative hover:cursor-pointer hover:shadow-md transition-all duration-200 ease-in-out",
                {
                    "border-gray-300 border-1": !passwordIsWrong,
                    "ring-red-300 ring-1 border-red-300 border-1": passwordIsWrong,
                })}>
                <div className="absolute top-3 right-2 flex gap-1">
                    <div className={cn("flex aspect-square size-8 text items-center justify-center rounded-lg",
                        {
                            "bg-gray-100": !driveOpen,
                            "bg-[#f5d9d0]": passwordIsWrong,
                            "bg-primary": driveOpen && !passwordIsWrong
                        }
                    )}>

                        <Tooltip>
                            <TooltipTrigger>
                                {!driveOpen
                                    ? <Folder className="w-4 h-4" />
                                    : passwordIsWrong ?
                                        <FolderX className="w-4 h-4" />
                                        : <FolderOpen className="w-4 h-4" />
                                }
                            </TooltipTrigger>
                            <TooltipContent>
                                {!driveOpen
                                    ? "Drive is closed"
                                    : passwordIsWrong ?
                                        "Password is wrong"
                                        : "Drive is open"
                                }
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex aspect-square size-8 text items-center justify-center rounded-lg bg-gray-100">
                        <Tooltip>
                            <TooltipTrigger>
                                <EyeOff className="w-4 h-4" />
                            </TooltipTrigger>
                            <TooltipContent>
                                Only you have acess to the drive
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-5">
                    <div className={cn("flex aspect-square size-11 items-center justify-center rounded-lg bg-gray-100 text-sidebar-primary-foreground",
                        {
                            "bg-gray-100": !driveOpen,
                            "bg-[#f5d9d0]": passwordIsWrong,
                            "bg-primary": driveOpen && !passwordIsWrong
                        }
                    )}>
                        <DriveIcon driveInfo={driveInfo} className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-montserrat text-lg font-semibold ml-2 overflow-hidden overflow-ellipsis max-w-45 text-nowrap">{driveInfo.title}</h2>
                        {driveStats?.description ?
                            <div className="text-gray-600 text-xs pl-2 text-nowrap overflow-hidden overflow-ellipsis max-w-60">{driveStats?.description}</div> :
                            <div className="bg-gray-200 text-sm w-60 h-4 ml-2 rounded-md"></div>}
                    </div>
                </div>

                <div className="text-gray-500 text-sm mb-1">
                    Total size: 23 Gb
                </div>
                <div className="text-gray-500 text-sm mb-2 flex items-center" >
                    Effective size: {!driveOpen || passwordIsWrong ? <div className="inline-block bg-gray-200 text-sm w-20 h-4 ml-2 rounded-md"></div> : <span> 12 Gb / 224 files</span>}
                </div>

                <div className="text-gray-500 text-xs mb-5">
                    Last opened: 12/12/2024, 12:32 PM
                </div>

                <div className="mb-2">
                    {!driveOpen && !readyToTryNewPassword && <Button variant={"default"} className="px-3 xs:px-5">Open drive</Button>}
                    {(passwordIsWrong || readyToTryNewPassword) && <Button variant={"secondary"} onClick={handleTryAgainClick} className="mr-3 border-1 border-b-gray-200 px-6">Try again</Button>}
                    {(driveOpen || readyToTryNewPassword) && <Button variant={"black"} onClick={handleCloseClick}>Close drive</Button>}
                    {!passwordIsWrong && !readyToTryNewPassword && (<>
                        <Button variant={"outline"} className="ml-2 px-3 xs:px-5" onClick={handleSettingsClick}>Settings</Button>
                        <Button variant={"outline"} className="ml-2 px-3 xs:px-5">View logs</Button>
                    </>)}

                </div>
            </div>
        </Link>
    );
}
