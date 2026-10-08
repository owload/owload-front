import { useMemo, useState } from "react";
import { ChevronLeft, MonitorSmartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { ActivityEventRow } from "@/components/profile/activity-event";
import { ProfileButton, ProfileCard } from "@/components/profile/profile-parts";
import { ProfileTop } from "@/components/profile/profile-top";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserEvent } from "@/engine/backend/user-backend";
import { useActivity } from "@/hooks/use-activity";
import { formatDayHeading } from "@/lib/format-when";
import { cn } from "@/lib/utils";

const FILTERS = [
    { id: "all", label: "All", kinds: undefined },
    { id: "sign-ins", label: "Sign-ins", kinds: ["sign_in", "sign_out", "session_revoked", "other_sessions_revoked"] },
    { id: "profile", label: "Profile", kinds: ["name_changed", "picture_changed"] },
    { id: "drives", label: "Drives", kinds: ["drive_created", "drive_restored", "drive_deleted", "storage_target_added", "storage_target_main_changed", "storage_target_removed"] },
    { id: "access", label: "Access", kinds: ["drive_opened", "drive_files_read", "drive_written"] },
] as const;

/** The events of one day, under the heading of the day. */
function groupByDay(events: UserEvent[]): { heading: string, events: UserEvent[] }[] {
    const groups: { heading: string, events: UserEvent[] }[] = [];
    for (const event of events) {
        const heading = formatDayHeading(event.at);
        const last = groups[groups.length - 1];
        if (last && last.heading === heading) last.events.push(event);
        else groups.push({ heading, events: [event] });
    }
    return groups;
}

/** Everything that has happened to the account: sign-ins and sign-outs, profile changes, drives created and deleted. */
export function ActivityPage() {
    const [filterId, setFilterId] = useState<(typeof FILTERS)[number]["id"]>("all");
    const filter = FILTERS.find((f) => f.id === filterId)!;
    const kinds = useMemo(() => (filter.kinds ? [...filter.kinds] : undefined), [filter]);
    const { events, failed, loading, hasMore, loadMore } = useActivity({ kinds, pageSize: 25 });
    const groups = useMemo(() => groupByDay(events ?? []), [events]);

    return (
        <div className="absolute inset-0 overflow-y-auto bg-white">
            <ProfileTop />
            <main className="relative flex flex-col gap-[22px] px-4 pb-10 pt-4 md:px-10 md:pt-1">
                <div className="flex min-w-0 flex-col items-start gap-2">
                    <Link to="/profile" className="flex min-h-9 items-center gap-1 text-[13px] font-semibold text-sunny-text-on-white underline-offset-4 outline-sunny-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
                        <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2.2} />Profile
                    </Link>
                    <h1 className="m-0 text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] max-md:text-[26px]">Account activity</h1>
                    <p className="m-0 max-w-[620px] text-sm text-sunny-muted">
                        Sign-ins, sign-outs and changes to your account, with the device and the address each came from. Only you can see this. It is kept for a year.
                    </p>
                    <Link
                        to="/profile"
                        state={{ section: "devices" }}
                        className="flex min-h-9 items-center gap-2 text-sm font-semibold text-sunny-ink underline underline-offset-4 outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        <MonitorSmartphone aria-hidden="true" className="size-4" strokeWidth={2.2} />Signed-in devices and sessions
                    </Link>
                </div>

                <div role="tablist" aria-label="Kind of activity" className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-full bg-sunny-field p-[3px]">
                    {FILTERS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            role="tab"
                            aria-selected={filterId === f.id}
                            onClick={() => setFilterId(f.id)}
                            className={cn(
                                "flex h-[38px] cursor-pointer items-center rounded-full px-3.5 text-sm font-semibold text-sunny-ink outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2",
                                filterId === f.id ? "bg-sunny-yellow" : "hover:bg-sunny-ink/10",
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <ProfileCard title={filter.label === "All" ? "All activity" : filter.label} className="max-w-[760px]">
                    {events === undefined
                        ? (failed ? <p className="m-0 text-sm text-sunny-muted">The activity could not be loaded.</p> : <Skeleton className="h-[240px] w-full rounded-xl" />)
                        : events.length === 0
                            ? <p className="m-0 text-sm text-sunny-muted">Nothing here yet.</p>
                            : groups.map((group) => (
                                <section key={group.heading} className="flex flex-col gap-1">
                                    <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-sunny-muted">{group.heading}</h2>
                                    <ul className="m-0 flex list-none flex-col p-0">
                                        {group.events.map((event) => <ActivityEventRow key={event.id} event={event} />)}
                                    </ul>
                                </section>
                            ))}
                    {events !== undefined && failed && <p className="m-0 text-xs text-sunny-muted">More could not be loaded.</p>}
                    {hasMore && <ProfileButton className="self-start" disabled={loading} onClick={() => void loadMore()}>{loading ? "Loading…" : "Show more"}</ProfileButton>}
                </ProfileCard>
            </main>
        </div>
    );
}
