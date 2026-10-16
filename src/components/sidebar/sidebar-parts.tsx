import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSidebar } from "../ui/sidebar";
import { Button } from "../ui/button";
import { useUserProfile } from "@/hooks/use-user-profile";
import { formatDateTime } from "@/lib/format-when";
import { PRICING_URL } from "@/lib/site-links";
import { cn } from "@/lib/utils";
import { useStorageUsage } from "@/hooks/use-storage-usage";
import { FREE_PLAN_STORAGE_BYTES, storagePercent } from "@/lib/storage-usage";
import { formatBytes } from "@/components/drives/drive-stats-format";

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
 * The storage block and the last-seen line at the bottom of the side panel. The storage is what the drives the user owns hold in Owload's
 * own storage (the S3 presets), out of the plan's fixed amount; the user's own S3 is not limited and is not shown here (the profile page
 * has it). "Last seen" is when the user was here before this visit (nothing on the very first visit).
 */
export function SidebarStorage({ className }: { className?: string }) {
  const { profile } = useUserProfile();
  const lastSeen = formatDateTime(profile?.lastSeen);
  const usage = useStorageUsage();
  const total = formatBytes(FREE_PLAN_STORAGE_BYTES);
  const percent = usage ? storagePercent(usage.presetBytes) : 0;
  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <div className="flex flex-col gap-2.5 rounded-[14px] bg-sidebar-accent p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-white">Storage</span>
          <span className="text-xs tabular-nums text-sunny-on-dark" title="What your drives hold in Owload's storage (drives on your own S3 are not counted)">
            {usage ? `${formatBytes(usage.presetBytes)}${usage.complete ? "" : "+"} of ${total}` : `of ${total}`}
          </span>
        </div>
        <div role="img" aria-label={usage ? `${formatBytes(usage.presetBytes)} of ${total} of Owload storage used` : "Storage is being counted"} className="h-1 overflow-hidden rounded-full bg-sunny-ink-track">
          <div className="h-full rounded-full bg-sidebar-primary" style={{ width: `${percent}%` }} />
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
