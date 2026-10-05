import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSidebar } from "../ui/sidebar";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

/** The logo at the top of the dark side panel. */
export function SidebarLogo() {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <div className="flex items-center justify-between gap-3">
      <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center px-1.5">
        <img src="/logo-full.svg" alt="" className="h-9 w-auto brightness-0 invert" />
      </Link>
      {isMobile && (
        <button type="button" aria-label="Close menu" onClick={() => setOpenMobile(false)} className="-mr-3 flex size-12 flex-none cursor-pointer items-center justify-center rounded-xl text-white hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-sidebar-ring">
          <X aria-hidden="true" className="size-[22px]" />
        </button>
      )}
    </div>
  );
}

/** The storage block and the last-seen line at the bottom of the side panel (the numbers are placeholders, as before). */
export function SidebarStorage({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <div className="flex flex-col gap-3 rounded-[14px] bg-sidebar-accent p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-white">Storage</span>
          <span className="text-[13px] text-sunny-on-dark">1.5 GB of 3 GB</span>
        </div>
        <div role="img" aria-label="Half of storage used" className="h-1.5 overflow-hidden rounded-[3px] bg-sunny-ink-track">
          <div className="h-full w-1/2 rounded-[3px] bg-sidebar-primary" />
        </div>
        <Button variant="outline" className="h-11 w-full rounded-[10px] border-[1.5px] border-sidebar-primary bg-transparent font-bold text-sidebar-primary hover:bg-sidebar-primary hover:text-sidebar-primary-foreground">
          Upgrade
        </Button>
      </div>
      <div className="text-center text-[13px] text-sunny-on-dark">Last seen Feb 2, 19:32</div>
    </div>
  );
}
