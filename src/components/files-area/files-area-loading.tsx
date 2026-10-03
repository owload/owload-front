import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

export function FilesAreaLoading() {
    const isMobile = useIsMobile();
    const skeletonItems = Array.from({ length: 8 });

    const mobileSizePx = Math.floor(window.innerWidth / 3) - 30;
    const gapSizePx = 16;
    const size = isMobile ? mobileSizePx : 160;
    const nameMargin = isMobile ? 4 : 8;

    return (
        <div className={cn("", {
            "ml-5 mt-2": isMobile,
            "ml-10 mt-10": !isMobile,
        })}>
            <div style={{ width: isMobile ? mobileSizePx * 3 + gapSizePx * 3 : 'auto' }} className="pl-3 xs:pl-0">
                {skeletonItems.map((_, index) => (
                    <div key={index} className={cn("inline-block", {
                        "mr-3 mb-3": isMobile,
                        "mr-5 mb-5": !isMobile
                    })}>
                        <Skeleton style={{ width: `${size}px`, height: `${size}px` }} className="mb-2"></Skeleton>
                        <Skeleton style={{ width: `${size-nameMargin*2}px`, margin: `0px ${nameMargin}px` }} className="h-4 bg-gray-300 rounded"></Skeleton>
                    </div>
                ))}
            </div>
        </div>
    );
}
