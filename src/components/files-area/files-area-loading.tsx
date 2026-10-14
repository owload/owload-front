import { useViewMode } from "@/stores/view-mode-store";
import { Skeleton } from "../ui/skeleton";

// The skeleton is drawn with the same container, grid and sizes as the populated area (populated-files-area.tsx, file-object.tsx), so that
// nothing moves when the files arrive. Many items are drawn and the container clips them, so that any screen is filled.
const GRID_ITEMS = 30;
const LIST_ITEMS = 16;
const NAME_WIDTHS = ["62%", "48%", "74%", "55%", "68%", "41%"];

function GridSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-[18px] sm:gap-y-[22px]">
            {Array.from({ length: GRID_ITEMS }, (_, index) => (
                <div key={index} className="relative -m-1.5 flex min-w-0 flex-col gap-2 p-1.5">
                    <Skeleton className="aspect-[4/3] w-full rounded-[14px]" />
                    <div className="flex min-h-[22px] min-w-0 items-center gap-1.5">
                        <Skeleton className="size-[13px] flex-none rounded-[3px]" />
                        <Skeleton className="h-3.5 rounded" style={{ width: NAME_WIDTHS[index % NAME_WIDTHS.length] }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ListSkeleton() {
    return (
        <>
            <div aria-hidden="true" className="grid h-9 max-sm:hidden grid-cols-[minmax(0,1fr)_110px_44px] items-center gap-x-4 border-b border-sunny-line pl-3 pr-1 text-[13px] font-semibold text-muted-foreground">
                <span>Name</span>
                <span>Size</span>
                <span />
            </div>
            <div className="flex flex-col">
                {Array.from({ length: LIST_ITEMS }, (_, index) => (
                    <div key={index} className="grid min-h-[52px] max-sm:min-h-[60px] min-w-0 grid-cols-[minmax(0,1fr)_110px_44px] items-center gap-x-4 border-b border-[#eeede7] pl-3 pr-1 max-sm:grid-cols-[minmax(0,1fr)_44px] max-sm:[&>span:nth-child(2)]:hidden">
                        <div className="flex min-h-11 min-w-0 items-center gap-3">
                            <Skeleton className="size-9 flex-none rounded-[9px]" />
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <Skeleton className="h-3.5 rounded" style={{ width: NAME_WIDTHS[index % NAME_WIDTHS.length] }} />
                                {/* on a phone the size sits under the name */}
                                <Skeleton className="hidden h-3 w-16 rounded max-sm:block" />
                            </div>
                        </div>
                        <span><Skeleton className="h-3 w-14 rounded" /></span>
                        <span aria-hidden="true" />
                    </div>
                ))}
            </div>
        </>
    );
}

/** What the files area shows while a folder is being read: the same grid or list as the files will be in, in the user's chosen view. */
export function FilesAreaLoading() {
    const viewMode = useViewMode((state) => state.viewMode);
    return (
        <div role="status" aria-label="Loading files" className="absolute inset-x-0 inset-y-0 top-26 overflow-hidden pt-2 px-[clamp(16px,2.2vw,28px)]">
            {viewMode === "list" ? <ListSkeleton /> : <GridSkeleton />}
        </div>
    );
}
