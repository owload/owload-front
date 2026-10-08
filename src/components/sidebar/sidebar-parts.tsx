import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSidebar } from "../ui/sidebar";
import { Button } from "../ui/button";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatDateTime } from "@/lib/format-when";
import { PRICING_URL } from "@/lib/site-links";
import { cn } from "@/lib/utils";

/** The logo at the top of the dark side panel. */
export function SidebarLogo() {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <div className="flex items-center justify-between gap-3">
      <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center px-1.5">
        <img src="/logo-full.svg" alt="" className="h-[30px] w-auto brightness-0 invert" />
      </Link>
      {isMobile && (
        <button type="button" aria-label="Close menu" onClick={() => setOpenMobile(false)} className="-mr-3 flex size-12 flex-none cursor-pointer items-center justify-center rounded-xl text-white hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-sidebar-ring">
          <X aria-hidden="true" className="size-[22px]" />
        </button>
      )}
    </div>
  );
}

/**
 * The storage block and the last-seen line at the bottom of the side panel. The storage numbers are placeholders, as before;
 * "Last seen" is when the user was here before this visit (nothing on the very first visit).
 */
export function SidebarStorage({ className }: { className?: string }) {
  const { profile } = useUserProfile();
  const lastSeen = formatDateTime(profile?.lastSeen);
  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <div className="flex flex-col gap-2.5 rounded-[14px] bg-sidebar-accent p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-white">Storage</span>
          <span className="text-xs text-sunny-on-dark">1.5 GB of 3 GB</span>
        </div>
        <div role="img" aria-label="Half of storage used" className="h-1 overflow-hidden rounded-full bg-sunny-ink-track">
          <div className="h-full w-1/2 rounded-full bg-sidebar-primary" />
        </div>
        <Button asChild variant="outline" className="h-11 w-full rounded-[10px] border border-sidebar-primary bg-transparent font-semibold text-sidebar-primary hover:bg-sidebar-primary hover:text-sidebar-primary-foreground">
          <a href={PRICING_URL} target="_blank" rel="noopener noreferrer">Upgrade</a>
        </Button>
      </div>
      {lastSeen && (
        <Link to="/profile/activity" className="rounded text-center text-xs text-sunny-on-dark underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-sidebar-ring" title="See the activity of your account">
          Last seen {lastSeen}
        </Link>
      )}
    </div>
  );
}
