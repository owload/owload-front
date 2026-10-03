import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface FileProgressCardTitleProps {
    progress: number,
    error?: boolean
}

export function FileProgressCardTitle({ progress, error = false, children }: FileProgressCardTitleProps & PropsWithChildren) {

    return (
        <div className={cn("relative overflow-hidden px-2 py-0 h-11 rounded-t-md font-semibold font-noto text-lg", error ? "bg-[#EB5757]/20" : "bg-primary/20")}>
            <div
                className={cn("z-10 absolute inset-0 rounded-lt-md transition duration-300", error ? "bg-[#EB5757]" : "bg-primary")}
                style={{ transform: `translateX(-${100-progress}%)` }}
            ></div>
            <div className={cn("z-12 absolute inset-0 py-1.5 px-3", error && progress >= 100 && "text-white")}>{children}</div>
        </div>
    );
}