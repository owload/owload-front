import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { FileProgressCard } from "../file-progress-card/file-progress-card";
import { useMediaBreakpoint } from "@/hooks/use-media-breakpoint";
import { FileProgressCircle } from "../file-progress-card/file-progress-circle";

export function UploadStateButton({ className, size = 44 }: { className?: string, size?: number }) {
    const mediaBreakpoint = useMediaBreakpoint();
    const drawerDirction = mediaBreakpoint === "2xs" || mediaBreakpoint === "xs" ? "bottom" : "right";
    return (

        <Drawer direction={drawerDirction}>
            <DrawerTrigger title="Upload status">
                <div
                    className={cn("rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:bg-primary", className)}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{ width: size, height: size }}
                >
                    <FileProgressCircle></FileProgressCircle>
                </div>
            </DrawerTrigger>
            <DrawerContent>
                <FileProgressCard></FileProgressCard>
            </DrawerContent>
        </Drawer>

    );
}
