import { ChevronsUpDown, LayoutGrid, Plus, Scan } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useFilesStore } from "@/stores/files-store"
import { Skeleton } from "../ui/skeleton"
import { DriveSelectOption } from "./drive-select-option"
import { Link, useLocation, useParams } from "react-router-dom"
import { DriveIcon } from "../drives/drive-icon"
import { cn } from "@/lib/utils"
import { DebouncedSkeleton } from "../ui/debounced-skeleton"


export function DriveSwitcher({ className }: { className?: string }) {
  const MAX_DRIVES_TO_SHOW = 5;
  const location = useLocation();
  const mode = location.pathname.startsWith("/drive") ? "drive-inside" : "drives";
  const { isMobile } = useSidebar();
  const { driveId: urlDriveId } = useParams<{ driveId: string }>();
  const drives = useFilesStore((state) => state.drives);
  const driveStats = useFilesStore((state) => state.driveStats);
  const driveClient = useFilesStore((state) => state.driveClient);
  const currentDriveId = driveClient?.getDriveId() ?? (mode === 'drive-inside' ? urlDriveId : undefined);
  const currentDriveInfo = currentDriveId ? drives.find(d => d.id === currentDriveId) : null;
  const openDrivesCount = useFilesStore((state) => Object.keys(state.driveKeys).length);

  const drivesToShow = [...drives].sort((a, b) => {
    const aStats = driveStats[a.id];
    const bStats = driveStats[b.id];
    if (aStats && bStats) {
      return a.title < b.title ? -1 : 1;
    } else if (aStats) {
      return -1;
    } else if (bStats) {
      return 1;
    }
    return 0;
  }).slice(0, MAX_DRIVES_TO_SHOW);
  const drivesInitialized = useFilesStore((state) => state.drivesInitialized);
  const initialized = drivesInitialized;

  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto gap-3 rounded-[14px] bg-sidebar-accent p-2 hover:bg-sidebar-accent/80 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <DebouncedSkeleton
                contentInitialized={!!initialized}
                initializedComponent={<>
                  {currentDriveId && currentDriveInfo != null && <>
                    <div className="flex size-11 flex-none items-center justify-center rounded-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
                      <DriveIcon driveInfo={currentDriveInfo} className="size-5" />
                    </div>
                    <div className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate font-bold text-white">
                        {currentDriveInfo.title}
                      </span>
                      <span className="truncate text-[13px] font-normal text-sunny-on-dark">Open</span>
                    </div>
                  </>}
                  {!currentDriveId && <>
                    <div className="flex size-11 flex-none items-center justify-center rounded-[10px] border border-sunny-ink-line text-white">
                      <Scan className="size-5" />
                    </div>
                    <div className="grid min-w-0 flex-1 text-left leading-tight">
                      <span className="truncate font-bold text-white">
                        Select drive
                      </span>
                      <span className="truncate text-[13px] font-normal text-sunny-on-dark">{openDrivesCount} of {drives.length} open</span>
                    </div>
                  </>}
                </>}
                skeletonComponent={<>
                  <Skeleton className="h-11 w-full bg-sunny-ink-track" />
                </>}
              />
              <ChevronsUpDown className="ml-auto mr-1.5 text-sunny-on-dark" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Drives
            </DropdownMenuLabel>
            {drivesToShow.map(driveInfo => (
              <Link to={`/drive/${driveInfo.id}`} key={driveInfo.id}>
                <DropdownMenuItem className={cn("gap-2 p-2",
                  {
                    "bg-primary/80": currentDriveId === driveInfo.id,
                  }
                )}>
                  <DriveSelectOption driveInfo={driveInfo} />
                </DropdownMenuItem>
              </Link>
            ))}
            <DropdownMenuSeparator />
            <Link to={`/`}>
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">All drives</div>
              </DropdownMenuItem>
            </Link>
            <Link to={`/create`}>
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Create new</div>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
