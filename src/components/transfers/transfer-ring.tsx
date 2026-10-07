import { cn } from "@/lib/utils";

/** A ring that fills clockwise from the top; the colours are given by the class names of the two circles (stroke-*). */
export function TransferRing({ size, stroke, percent, trackClass, barClass, className }: {
    size: number;
    stroke: number;
    percent: number;
    trackClass: string;
    barClass: string;
    className?: string;
}) {
    const c = size / 2;
    const r = c - stroke / 2 - (size > 30 ? 1.7 : 0.1 * size);
    const circumference = 2 * Math.PI * r;
    const filled = circumference * Math.min(100, Math.max(0, percent)) / 100;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={cn("block flex-none", className)}>
            <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
            <circle
                cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${filled} ${circumference}`}
                transform={`rotate(-90 ${c} ${c})`}
                className={cn("transition-[stroke-dasharray] duration-300", barClass)}
            />
        </svg>
    );
}
