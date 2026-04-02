import { PropsWithChildren } from "react";

interface FileProgressCardTitleProps {
    progress: number
}

export function FileProgressCardTitle({ progress, children }: FileProgressCardTitleProps & PropsWithChildren) {

    return (
        <div className="relative overflow-hidden bg-primary/20 px-2 py-0 h-11 rounded-t-md font-semibold font-noto text-lg">
            <div
                className="z-10 absolute inset-0 rounded-lt-md bg-primary transition duration-300"
                style={{ transform: `translateX(-${100-progress}%)` }}
            ></div>
            <div className="z-12 absolute inset-0 py-1.5 px-3">{children}</div>
        </div>
    );
}