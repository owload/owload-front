import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Grip, LogOut, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useLogout } from "@/auth-context-provider";
import { useOpenDrivesCount } from "@/hooks/use-open-drives-count";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useCloseAllDrives } from "@/hooks/use-close-drives";

export function NavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useLogout();
    const getOpenDrivesCount = useOpenDrivesCount();
    const openDrivesCount = getOpenDrivesCount();
    const closeAllDrives = useCloseAllDrives();

    function handleCloseAllDrivesClick() {
        const driveIsOpen = location.pathname.startsWith("/drive");
        if (driveIsOpen) {
            navigate("/?closeAllDrives=true");
        } else {
            closeAllDrives();
        }
    }

    const handleLogoutClick = () => {
        logout();
    }
    return (
        <div className="fixed left-0 right-0 bg-white z-25 flex items-center border-b-1">
            <div className="flex-10">
                <Link to="/">
                    <img src='/owl.svg' className="2xs:inline-block md:hidden ml-4 my-3 h-8 inline-block"></img>
                    <img src='/logo-full.svg' className="2xs:hidden md:inline-block ml-4 my-3 h-8 inline-block"></img>
                </Link>
                <Separator orientation='vertical' className="2xs:hidden md:inline-block ml-38 h-5 inline-block" />
                <Search className="2xs:ml-2 xs:ml-5 text-gray-400 inline-block" />
                <Input className="2xs:hidden sm:inline-block ml-3 sm:w-55 md:w-[33%] md:w-min-45 lg:w-70 border-gray-400" placeholder="Search" />
            </div>

            <div className="flex-3 flex justify-end 2xs:pr-5 lg:pr-10 items-center">

                <Button disabled={openDrivesCount === 0} variant={"black"} size={"sm"} className="2xs:mr-2 2xs:text-[8pt] 2xs:px-2 xs:mr-5 xs:text-xs xs:px-4 lg:mr-20" onClick={handleCloseAllDrivesClick}>
                    {openDrivesCount > 0 ? <>Close all drives ({openDrivesCount})</> : <>No drives open</>}
                </Button>

                <Grip className="2xs:hidden xs:inline-block mr-4" />
                <DropdownMenu>
                    <DropdownMenuTrigger className="cursor-pointer focus:outline-none focus:ring-[2px] focus:ring-offset-2 focus:ring-primary rounded-full">
                        <Avatar>
                            <AvatarImage src="/ava.jpg" />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="w-50" onClick={handleLogoutClick}>
                            <LogOut className="h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
