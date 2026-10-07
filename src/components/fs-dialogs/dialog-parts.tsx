import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DialogDescription, DialogTitle } from "../ui/dialog";
import { cn } from "@/lib/utils";

const TONES = {
    default: "bg-primary text-primary-foreground",
    danger: "bg-[#fbe9e7] text-[#b3261e]",
    warning: "bg-[#fbeee4] text-sunny-orange",
} as const;

/** The top of a dialog: a square icon, the title and, under it, what the dialog is about. */
export function DialogHead({ icon: Icon, tone = "default", title, subtitle }: {
    icon: LucideIcon;
    tone?: keyof typeof TONES;
    title: ReactNode;
    subtitle?: ReactNode;
}) {
    return (
        <div className="flex items-start gap-3.5 pr-8">
            <span aria-hidden="true" className={cn("flex size-11 flex-none items-center justify-center rounded-xl", TONES[tone])}>
                <Icon className="size-5" strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <DialogTitle className="break-words text-xl font-semibold leading-tight">{title}</DialogTitle>
                {subtitle
                    ? <DialogDescription className="text-sm">{subtitle}</DialogDescription>
                    : <DialogDescription className="sr-only">{typeof title === "string" ? title : "Dialog"}</DialogDescription>}
            </div>
        </div>
    );
}

/** Small round label with the initials of a user; the people other than the current user stand out. */
export function Avatar({ userId, isMine, size = 20 }: { userId: string; isMine: boolean; size?: number }) {
    const name = userId.includes("@") ? userId.slice(0, userId.indexOf("@")) : userId;
    return (
        <div
            style={{ width: size, height: size }}
            className={cn("flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", isMine ? "bg-secondary text-muted-foreground" : "bg-[#fbeee4] text-sunny-orange")}
        >
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

export function formatTs(ts: number) {
    return new Date(ts).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}
