import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { FileProgressCard } from "../file-progress-card/file-progress-card";
import { useMediaBreakpoint } from "@/hooks/use-media-breakpoint";
import { FileProgressCircle } from "../file-progress-card/file-progress-circle";
import { useIsAllTransferFinished, useUploadErrorCount } from "@/hooks/use-upload-progress";

export function UploadStateButton({ className, size = 44 }: { className?: string, size?: number }) {
    const mediaBreakpoint = useMediaBreakpoint();
    const drawerDirction = mediaBreakpoint === "2xs" || mediaBreakpoint === "xs" ? "bottom" : "right";
    const errorCount = useUploadErrorCount();
    const allFinished = useIsAllTransferFinished();
    const hasError = errorCount > 0;
    const title = hasError
        ? `${errorCount} ${errorCount > 1 ? "uploads" : "upload"} failed - open for details`
        : "Upload status";

    return (

        <Drawer direction={drawerDirction}>
            <DrawerTrigger title={title} aria-label={title}>
                <div
                    className={cn(
                        "rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:bg-primary",
                        hasError && "bg-[#EB5757] hover:bg-[#d94a4a]",
                        className
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: size, height: size }}
                >
                    {hasError && allFinished
                        ? <TriangleAlert size={Math.round(size * 0.5)} />
                        : <FileProgressCircle></FileProgressCircle>}
                </div>
            </DrawerTrigger>
            <DrawerContent>
                <FileProgressCard></FileProgressCard>
            </DrawerContent>
        </Drawer>

    );
}
