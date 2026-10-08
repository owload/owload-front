import { ChevronRight, History } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfileCard } from "./profile-parts";

/** A link to the page with everything that has happened to the account (the list itself is not on the profile page). */
export function ActivityCard() {
    return (
        <ProfileCard title="Account activity">
            <Link
                to="/profile/activity"
                className="flex min-h-[52px] items-center gap-3 rounded-xl text-sunny-ink outline-sunny-ink hover:bg-sunny-field focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-sunny-field">
                    <History className="size-[18px]" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">View account activity</span>
                    <span className="text-xs text-sunny-muted">Sign-ins, sign-outs and changes, with the device and address of each</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 flex-none text-sunny-muted" strokeWidth={2.2} />
            </Link>
        </ProfileCard>
    );
}
