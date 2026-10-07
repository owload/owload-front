import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";
import { useViewMode } from "@/stores/view-mode-store";

/** The grid / list switch. */
export function Toolbox(props: { className?: string }) {
    const viewMode = useViewMode((state) => state.viewMode);
    const setViewMode = useViewMode((state) => state.setViewMode);
    const button = "flex size-11 cursor-pointer items-center justify-center rounded-[11px] outline-ring focus-visible:outline-2";
    const active = "bg-primary text-primary-foreground";
    const idle = "text-muted-foreground hover:text-foreground";
    return (
        <div role="group" aria-label="View" className={cn("flex gap-0.5 rounded-[14px] bg-secondary p-[3px]", props.className)}>
            <button type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} className={cn(button, viewMode === "grid" ? active : idle)}>
                <LayoutGrid aria-hidden="true" className="size-[18px]" />
            </button>
            <button type="button" aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} className={cn(button, viewMode === "list" ? active : idle)}>
                <List aria-hidden="true" className="size-[18px]" />
            </button>
        </div>
    );
};
