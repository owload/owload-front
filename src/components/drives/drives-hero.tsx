import { Link } from "react-router-dom";
import { Lock, Menu, Plus } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AccountControls } from "./account-controls";

export type DrivesFilter = "all" | "private" | "shared";

interface DrivesHeroProps {
    total: number;
    openCount: number;
    filter: DrivesFilter;
    counts: Record<DrivesFilter, number>;
    onFilter: (filter: DrivesFilter) => void;
    onCloseAll: () => void;
}

const FILTERS: { value: DrivesFilter, label: string }[] = [
    { value: "all", label: "All" },
    { value: "private", label: "Private" },
    { value: "shared", label: "Shared" },
];

/** The ring decoration of the yellow band. */
function Rings({ className }: { className?: string }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 640 640" className={cn("pointer-events-none absolute fill-none stroke-sunny-yellow/22 stroke-[1.5]", className)}>
            <circle cx="320" cy="320" r="100" /><circle cx="320" cy="320" r="175" /><circle cx="320" cy="320" r="250" /><circle cx="320" cy="320" r="318" />
        </svg>
    );
}

/** The dark pill with the drive counts above the title. */
function CountPill({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 rounded-3xl bg-(--drives-band-raised) py-1.5 pl-1.5 pr-[18px] font-semibold text-white">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-sunny-yellow text-sunny-ink">
                <Lock aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
            {children}
        </div>
    );
}

/** The top of the drives page: the yellow band with the counts, the title, "Close all drives" and the filter. */
export function DrivesHero({ total, openCount, filter, counts, onFilter, onCloseAll }: DrivesHeroProps) {
    const { setOpenMobile } = useSidebar();
    const closedCount = total - openCount;
    return (
        <header className="relative overflow-hidden bg-(--drives-band) px-5 text-white md:border-l md:border-white/10 pb-[84px] pt-4 md:px-10 md:pb-[100px] md:pt-5">
            <Rings className="-right-[150px] -top-[190px] size-[640px] max-md:-right-[170px] max-md:-top-[150px] max-md:size-[440px]" />
            <div className="relative flex flex-col gap-5 md:gap-7">
                <div className="flex items-center gap-2">
                    <button type="button" aria-label="Menu" onClick={() => setOpenMobile(true)} className="-ml-3 flex size-12 flex-none cursor-pointer items-center justify-center rounded-xl text-white hover:bg-white/10 md:hidden">
                        <Menu aria-hidden="true" className="size-[22px]" />
                    </button>
                    <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center md:hidden">
                        <img src="/logo-full.svg" alt="" className="h-9 w-auto brightness-0 invert" />
                    </Link>
                    <div className="ml-auto">
                        <AccountControls onDark />
                    </div>
                </div>

                <div className="flex flex-col items-start gap-3.5 md:gap-4">
                    <CountPill>
                        <span>{total} {total === 1 ? "drive" : "drives"}</span>
                        <span aria-hidden="true" className="h-[18px] w-px bg-sunny-ink-track" />
                        <span className="text-sunny-yellow">{closedCount} closed</span>
                    </CountPill>
                    <h1 className="m-0 text-4xl font-extrabold leading-[1.25] tracking-[-0.03em] md:text-[56px] md:leading-[1.15]">
                        My drives{" "}
                        <span className="inline-block rounded-[10px] bg-sunny-yellow px-3 pb-0.5 text-sunny-ink md:rounded-xl md:px-4 md:pb-1">
                            {openCount > 0 ? `${openCount} open` : "all closed"}
                        </span>
                    </h1>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                    <div className="flex gap-2">
                        <button type="button" onClick={onCloseAll} disabled={openCount === 0} className="flex h-[52px] flex-auto cursor-pointer items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-sunny-yellow px-3.5 font-bold text-sunny-ink outline-sunny-yellow hover:bg-sunny-yellow-edge focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-60 md:flex-none md:px-[22px]">
                            <Lock aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                            Close all drives
                        </button>
                        <Link to="/create" className="flex h-[52px] flex-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-3.5 font-bold text-sunny-ink hover:bg-sunny-field md:hidden">
                            <Plus aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                            New drive
                        </Link>
                    </div>
                    <div role="group" aria-label="Show drives" className="flex gap-0.5 rounded-[28px] bg-(--drives-band-raised) p-1">
                        {FILTERS.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={filter === value}
                                onClick={() => onFilter(value)}
                                className={cn(
                                    "flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[22px] px-2 font-semibold text-white outline-sunny-yellow focus-visible:outline-2 focus-visible:outline-offset-2 md:flex-none md:gap-2 md:px-[18px]",
                                    filter === value ? "bg-sunny-yellow text-sunny-ink" : "hover:bg-white/10",
                                )}
                            >
                                {label}
                                <span className="text-[13px] font-medium opacity-75">{counts[value]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </header>
    );
}

/** The header of the page when there are no drives yet. */
export function EmptyDrivesHero() {
    const { setOpenMobile } = useSidebar();
    return (
        <header className="relative overflow-hidden bg-(--drives-band) px-5 text-white md:border-l md:border-white/10 pb-[84px] pt-4 md:px-10 md:pb-[108px] md:pt-5">
            <Rings className="-right-[150px] -top-[190px] size-[640px] max-md:-right-[170px] max-md:-top-[150px] max-md:size-[440px]" />
            <div className="relative flex flex-col gap-5 md:gap-7">
                <div className="flex items-center gap-2">
                    <button type="button" aria-label="Menu" onClick={() => setOpenMobile(true)} className="-ml-3 flex size-12 flex-none cursor-pointer items-center justify-center rounded-xl text-white hover:bg-white/10 md:hidden">
                        <Menu aria-hidden="true" className="size-[22px]" />
                    </button>
                    <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center md:hidden">
                        <img src="/logo-full.svg" alt="" className="h-9 w-auto brightness-0 invert" />
                    </Link>
                    <div className="ml-auto">
                        <AccountControls onDark />
                    </div>
                </div>
                <div className="flex flex-col items-start gap-3.5 md:gap-4">
                    <CountPill>
                        <span>My drives</span>
                        <span aria-hidden="true" className="h-[18px] w-px bg-sunny-ink-track" />
                        <span className="text-sunny-yellow">0 drives</span>
                    </CountPill>
                    <h1 className="m-0 text-4xl font-extrabold leading-[1.3] tracking-[-0.03em] md:text-[56px] md:leading-[1.15]">
                        Create your{" "}
                        <span className="inline-block rounded-[10px] bg-sunny-yellow px-3 pb-0.5 text-sunny-ink md:rounded-xl md:px-4 md:pb-1">first drive</span>
                    </h1>
                </div>
            </div>
        </header>
    );
}

