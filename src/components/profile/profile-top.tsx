import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { AccountControls } from "@/components/drives/account-controls";
import { Rings, TopRow } from "@/components/drives/page-top";

/** The top of the profile page: on a phone the dark bar with the menu, the logo and the account; on a wide screen the circles and the account at the right. */
export function ProfileTop() {
    const { setOpenMobile } = useSidebar();
    return (
        <>
            <header className="flex h-14 items-center gap-1 bg-sunny-ink px-2 text-white md:hidden">
                <button type="button" aria-label="Menu" onClick={() => setOpenMobile(true)} className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-sunny-yellow">
                    <Menu aria-hidden="true" className="size-5" />
                </button>
                <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center">
                    <img src="/logo-full.svg" alt="" className="h-[26px] w-auto brightness-0 invert" />
                </Link>
                <span className="flex-1" />
                <AccountControls onDark />
            </header>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 hidden h-[250px] overflow-hidden md:block">
                <Rings />
            </div>
            <div className="relative hidden md:block">
                <TopRow />
            </div>
        </>
    );
}
