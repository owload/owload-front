import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { AccountControls } from "./account-controls";

/** The concentric circles in the corner of the header. */
export function Rings() {
    return (
        <svg aria-hidden="true" viewBox="0 0 840 840" className="pointer-events-none absolute -right-[270px] -top-[324px] size-[840px] fill-none stroke-[#e7e5dc] stroke-[1.2]">
            {[70, 140, 210, 280, 350, 420].map((r) => <circle key={r} cx="420" cy="420" r={r} />)}
        </svg>
    );
}

/** The row at the top of the header: the menu and the logo on a phone, the apps and the account at the right. */
export function TopRow() {
    const { setOpenMobile } = useSidebar();
    return (
        <div className="relative flex items-center gap-2 px-4 pt-3 md:justify-end md:px-7">
            <button type="button" aria-label="Menu" onClick={() => setOpenMobile(true)} className="-ml-2 flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl text-sunny-ink hover:bg-sunny-ink/10 md:hidden">
                <Menu aria-hidden="true" className="size-[22px]" />
            </button>
            <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center md:hidden">
                <img src="/logo-full.svg" alt="" className="h-8 w-auto" />
            </Link>
            <div className="max-md:ml-auto">
                <AccountControls alwaysShowApps />
            </div>
        </div>
    );
}
