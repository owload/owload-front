import { LockKeyhole, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useOpenDrivesCount } from "@/hooks/use-open-drives-count";
import { AccountControls } from "./drives/account-controls";
import { useCloseAllDrives } from "@/hooks/use-close-drives";

export function NavBar() {
    const navigate = useNavigate();
    const location = useLocation();
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

    // The drives pages draw their own header.
    if (location.pathname === "/" || location.pathname === "/create" || location.pathname.startsWith("/profile")) {
        return null;
    }

    return (
        <header className="absolute inset-x-0 top-0 z-25 flex h-[73px] items-center gap-3 border-b border-border bg-background px-[clamp(16px,2.2vw,28px)]">
            <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center md:hidden">
                <img src='/owl.svg' alt="" className="h-8" />
            </Link>
            <div className="relative hidden max-w-[440px] flex-1 items-center sm:flex">
                <label htmlFor="app-search" className="sr-only">Search files</label>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 size-[18px] text-muted-foreground" />
                <Input id="app-search" type="search" placeholder="Search" className="h-11 border-transparent bg-secondary pl-10" />
            </div>

            <div className="ml-auto flex items-center gap-2">
                <Button disabled={openDrivesCount === 0} variant="outline" className="gap-2 pl-3.5 pr-2 font-bold has-[>svg]:pl-3.5 has-[>svg]:pr-2" onClick={handleCloseAllDrivesClick}>
                    <LockKeyhole aria-hidden="true" className="size-[18px]" />
                    <span className="2xs:hidden xs:inline">{openDrivesCount > 0 ? "Close all drives" : "No drives open"}</span>
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-sunny-ink px-2 text-[13px] text-sunny-yellow">{openDrivesCount}</span>
                </Button>

                <AccountControls />
            </div>
        </header>
    );
}
