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
import { Link, useLocation } from "react-router-dom"
import { DriveIcon } from "../drives/drive-icon"
import { cn } from "@/lib/utils"
import { DebouncedSkeleton } from "../ui/debounced-skeleton"


export function DriveSwitcher({ className }: { className?: string }) {
  const MAX_DRIVES_TO_SHOW = 5;
  const location = useLocation();
  const mode = location.pathname.startsWith("/drive") ? "drive-inside" : "drives";
  const { isMobile } = useSidebar();
  const drives = useFilesStore((state) => state.drives);
  const driveStats = useFilesStore((state) => state.driveStats);
  const driveClient = useFilesStore((state) => state.driveClient);
  const currentDriveId = driveClient?.getDriveId();
  const currentDriveInfo = currentDriveId ? drives.find(d => d.id === currentDriveId) : null;
  const currentDriveDescription = currentDriveId ? driveStats[currentDriveId]?.description : null;

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
  const filesInitialized = useFilesStore((state) => state.filesInitialized);
  const initialized = mode === 'drive-inside' ? drivesInitialized && filesInitialized : drivesInitialized;

  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="py-7 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <DebouncedSkeleton
                contentInitialized={!!initialized}
                initializedComponent={<>
                  {currentDriveId && currentDriveInfo != null && <>
                    <div className="flex aspect-square size-11 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <DriveIcon driveInfo={currentDriveInfo} />
                    </div>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-semibold">
                        {currentDriveInfo.title}
                      </span>
                      <span className="truncate text-xs">{currentDriveDescription}</span>
                    </div>
                  </>}
                  {!currentDriveId && <>
                    <div className="flex aspect-square size-11 items-center justify-center rounded-lg bg-gray-200 text-sidebar-primary-foreground">
                      <Scan />
                    </div>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-semibold">
                        Select drive
                      </span>
                    </div>
                  </>}
                </>}
                skeletonComponent={<>
                  <Skeleton className="h-11 w-full bg-skeleton" />
                </>}
              />
              <ChevronsUpDown className="ml-auto" />
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
