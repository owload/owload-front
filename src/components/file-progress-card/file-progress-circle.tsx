import { useIsAllTransferFinished, useTotalTransferProgress } from "@/hooks/use-upload-progress";
import { cn } from "@/lib/utils";

export function FileProgressCircle({ size = 19, strokeWidth = 3, progressColor = "#00755E", emptyColor = "transparent" }: { size?: number, strokeWidth?: number, progressColor?: string, emptyColor?: string }) {
    const getTotalProgress = useTotalTransferProgress();
    const allFinished = () => useIsAllTransferFinished();
    return (
        <div className="rounded-full text-primary-foreground flex items-center justify-center">
            <span className="text-[10px]">{getTotalProgress()}%</span>
            <svg style={{ width: (size+strokeWidth)*2, height: (size+strokeWidth)*2 }} className={cn("absolute", {
                "animate-spin": !allFinished()
            })} viewBox={`0 0 ${size * 2 + strokeWidth * 2} ${size * 2 + strokeWidth * 2}`}>
                <circle
                    className={cn("progress-ring__circle stroke-current",
                        {
                            "animate-pulse": !allFinished()
                        })}
                    style={{ stroke: emptyColor, transition: 'stroke-dashoffset 0.35s' }}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    cx={size + strokeWidth}
                    cy={size + strokeWidth}
                    r={size + strokeWidth / 2}
                    fill="transparent"
                ></circle>
                <circle
                    className={cn("progress-ring__circle stroke-current",
                        {
                            "animate-pulse": !allFinished()
                        })}
                    style={{ stroke: progressColor, transition: 'stroke-dashoffset 0.35s' }}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    cx={size + strokeWidth}
                    cy={size + strokeWidth}
                    r={size + strokeWidth / 2}
                    fill="transparent"
                    strokeDasharray={`${(2 * Math.PI * (size + strokeWidth / 2)) * getTotalProgress() / 100} ${(2 * Math.PI * (size + strokeWidth / 2))}`}
                    strokeDashoffset="0"
                ></circle>
            </svg>
        </div >
    );
}