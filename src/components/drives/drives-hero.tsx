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

/** The concentric circles in the corner of the header. */
function Rings() {
    return (
        <svg aria-hidden="true" viewBox="0 0 840 840" className="pointer-events-none absolute -right-[270px] -top-[324px] size-[840px] fill-none stroke-[#e7e5dc] stroke-[1.2]">
            {[70, 140, 210, 280, 350, 420].map((r) => <circle key={r} cx="420" cy="420" r={r} />)}
        </svg>
    );
}

/** The row at the top of the header: the menu and the logo on a phone, the apps and the account at the right. */
function TopRow() {
    const { setOpenMobile } = useSidebar();
    return (
        <div className="relative flex items-center gap-2 px-4 pt-3 md:justify-end md:px-7">
            <button type="button" aria-label="Menu" onClick={() => setOpenMobile(true)} className="-ml-2 flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl text-sunny-ink hover:bg-sunny-ink/10 md:hidden">
                <Menu aria-hidden="true" className="size-[22px]" />
            </button>
            <Link to="/" aria-label="Owload home" className="flex min-h-11 items-center md:hidden">
                <img src="/logo-full.svg" alt="" className="h-8 w-auto" />
            </Link>
            <div className="max-md:ml-auto">
                <AccountControls alwaysShowApps />
            </div>
        </div>
    );
}

/** The small line above the title: the counts of the drives. */
function CountsLine({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#3b3a34]">
            <Lock aria-hidden="true" className="size-3.5 text-[#6a6442]" strokeWidth={2.2} />
            {children}
        </div>
    );
}

const divider = <span aria-hidden="true" className="h-3 w-px bg-[#cfcdc3]" />;

/** The top of the drives page: the counts, the title, "Close all drives" and the filter, over a pattern of circles. */
export function DrivesHero({ total, openCount, filter, counts, onFilter, onCloseAll }: DrivesHeroProps) {
    const closedCount = total - openCount;
    return (
        <header className="relative overflow-hidden pb-[68px] text-sunny-ink">
            <Rings />
            <TopRow />
            <div className="relative flex flex-col items-start gap-3.5 px-4 pt-1 md:px-10">
                <div className="flex flex-col items-start gap-2">
                    <CountsLine>
                        <span>{total} {total === 1 ? "drive" : "drives"}</span>
                        {divider}
                        <span className="text-[#6a6442]">{closedCount} closed</span>
                    </CountsLine>
                    <h1 className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] max-md:text-[28px]">
                        <span>My drives</span>
                        <span className={cn("rounded-[9px] px-[9px] pb-px text-[22px] leading-[1.5]", openCount > 0 ? "bg-sunny-yellow" : "bg-sunny-field text-[#3b3a34]")}>
                            {openCount > 0 ? `${openCount} open` : "0 open"}
                        </span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                    <button type="button" onClick={onCloseAll} disabled={openCount === 0} className="flex h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-sunny-yellow px-4 font-semibold text-sunny-ink outline-sunny-ink hover:bg-sunny-yellow-edge focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-sunny-yellow">
                        <Lock aria-hidden="true" className="size-4" strokeWidth={2.2} />
                        Close all drives
                    </button>
                    <div role="tablist" aria-label="Drive type" className="flex gap-0.5 rounded-full bg-sunny-field p-[3px]">
                        {FILTERS.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={filter === value}
                                onClick={() => onFilter(value)}
                                className={cn(
                                    "flex h-[38px] cursor-pointer items-center gap-[7px] rounded-full px-3.5 font-semibold text-sunny-ink outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2",
                                    filter === value ? "bg-sunny-yellow" : "hover:bg-sunny-ink/10",
                                )}
                            >
                                {label}
                                <span className={cn("text-xs font-medium", filter !== value && "text-sunny-muted")}>{counts[value]}</span>
                            </button>
                        ))}
                    </div>
                    <Link to="/create" className="flex h-11 items-center gap-2 rounded-[10px] border border-sunny-ink px-4 font-semibold text-sunny-ink hover:bg-sunny-ink/10 md:hidden">
                        <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
                        New drive
                    </Link>
                </div>
            </div>
        </header>
    );
}

/** The header of the page when there are no drives yet. */
export function EmptyDrivesHero() {
    return (
        <header className="relative overflow-hidden pb-[68px] text-sunny-ink">
            <Rings />
            <TopRow />
            <div className="relative flex flex-col items-start gap-3.5 px-4 pt-1 md:px-10">
                <div className="flex flex-col items-start gap-2">
                    <CountsLine>
                        <span>My drives</span>
                        {divider}
                        <span className="text-[#6a6442]">0 drives</span>
                    </CountsLine>
                    <h1 className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] max-md:text-[28px]">
                        <span>Create your</span>
                        <span className="rounded-[9px] bg-sunny-yellow px-[9px] pb-px text-[22px] leading-[1.5]">first drive</span>
                    </h1>
                </div>
            </div>
        </header>
    );
}
