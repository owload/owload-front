import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity } from "@/hooks/use-activity";
import { ActivityEventRow } from "./activity-event";
import { ProfileButton, ProfileCard } from "./profile-parts";

/** The latest events of the account, with a link to the whole list. */
export function ActivityCard() {
    const { events, failed, loading, hasMore, loadMore } = useActivity();

    return (
        <ProfileCard
            title="Account activity"
            action={<Link to="/profile/activity" className="flex min-h-9 items-center text-sm font-semibold text-sunny-ink underline underline-offset-4 outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2">View all</Link>}
        >
            {events === undefined
                ? (failed ? <p className="m-0 text-sm text-sunny-muted">The activity could not be loaded.</p> : <Skeleton className="h-[120px] w-full rounded-xl" />)
                : events.length === 0
                    ? <p className="m-0 text-sm text-sunny-muted">Nothing yet.</p>
                    : <ul className="m-0 flex list-none flex-col p-0">{events.map((event) => <ActivityEventRow key={event.id} event={event} />)}</ul>}
            {events !== undefined && failed && <p className="m-0 text-xs text-sunny-muted">More could not be loaded.</p>}
            {hasMore && <ProfileButton className="self-start" disabled={loading} onClick={() => void loadMore()}>{loading ? "Loading…" : "Show more"}</ProfileButton>}
        </ProfileCard>
    );
}
