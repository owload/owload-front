import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

/** The grid / list switch. Only the grid exists so far: the list button is drawn but does not change the view yet. */
export function Toolbox(props: { className?: string }) {
    const button = "flex size-11 cursor-pointer items-center justify-center rounded-[11px] outline-ring focus-visible:outline-2";
    return (
        <div role="group" aria-label="View" className={cn("flex gap-0.5 rounded-[14px] bg-secondary p-[3px]", props.className)}>
            <button type="button" aria-label="Grid view" aria-pressed="true" className={cn(button, "bg-primary text-primary-foreground")}>
                <LayoutGrid aria-hidden="true" className="size-[18px]" />
            </button>
            <button type="button" aria-label="List view" aria-pressed="false" className={cn(button, "text-muted-foreground hover:text-foreground")}>
                <List aria-hidden="true" className="size-[18px]" />
            </button>
        </div>
    );
};
