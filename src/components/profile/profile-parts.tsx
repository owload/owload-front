import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** A card of the profile page: a heading with an optional button at its right end, and the content. */
export function ProfileCard({ title, action, children, className }: { title: string, action?: React.ReactNode, children: React.ReactNode, className?: string }) {
    return (
        <section className={cn("flex min-w-0 flex-col gap-3.5 rounded-2xl border border-sunny-line bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]", className)}>
            <div className="flex min-h-10 items-center gap-2.5">
                <h2 className="m-0 text-[17px] font-semibold">{title}</h2>
                <span className="flex-1" />
                {action}
            </div>
            {children}
        </section>
    );
}

/** A small word in a coloured box: "Verified", "Off", "Current plan". */
export function Badge({ tone = "neutral", check, children }: { tone?: "neutral" | "green", check?: boolean, children: React.ReactNode }) {
    return (
        <span className={cn("flex h-[22px] flex-none items-center gap-1 rounded-[7px] px-2 text-[11px] font-semibold uppercase tracking-[0.06em]", tone === "green" ? "bg-sunny-green-bg text-sunny-green" : "bg-sunny-field text-sunny-text-on-yellow")}>
            {check && <Check aria-hidden="true" className="size-[11px]" strokeWidth={3} />}
            {children}
        </span>
    );
}

/** A row of the card: a small label over the value, and an optional button at the right. */
export function InfoRow({ label, action, first, children }: { label: string, action?: React.ReactNode, first?: boolean, children: React.ReactNode }) {
    return (
        <div className={cn("flex min-h-[60px] items-center gap-3 py-2", !first && "border-t border-sunny-line")}>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs text-sunny-muted">{label}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">{children}</span>
            </div>
            {action}
        </div>
    );
}

const BUTTON_BASE = "flex flex-none cursor-pointer items-center justify-center gap-2 rounded-[10px] px-3.5 text-sm font-semibold outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40";

const BUTTON_TONE = {
    dark: "border border-sunny-ink bg-white text-sunny-ink hover:bg-sunny-field",
    light: "border border-sunny-line bg-white text-sunny-ink hover:bg-sunny-field",
    yellow: "border-0 bg-sunny-yellow text-sunny-ink hover:bg-sunny-yellow-edge",
    ghost: "border-0 bg-transparent text-sunny-ink hover:bg-sunny-ink/10",
} as const;

/** The buttons of the profile page, in the sizes of the design (36, 40 and 44 px high). */
export function ProfileButton({ tone = "light", size = 40, className, ...props }: { tone?: keyof typeof BUTTON_TONE, size?: 36 | 40 | 44 } & React.ComponentProps<"button">) {
    return (
        <button
            type="button"
            className={cn(BUTTON_BASE, BUTTON_TONE[tone], size === 36 ? "h-9" : size === 44 ? "h-11 px-4" : "h-10", className)}
            {...props}
        />
    );
}
