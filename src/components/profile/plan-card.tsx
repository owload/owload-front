import { PRICING_URL } from "@/lib/site-links";
import { Badge, ProfileCard } from "./profile-parts";
import { PLACEHOLDER_STORAGE_PERCENT, PLACEHOLDER_STORAGE_TOTAL, PLACEHOLDER_STORAGE_USED } from "./profile-placeholders";

/** The plan and how much of the storage is used. */
export function PlanCard({ drivesCount }: { drivesCount: number }) {
    return (
        <ProfileCard title="Plan and storage">
            <div className="flex items-center gap-2.5">
                <span className="text-[19px] font-semibold">Free</span>
                <Badge>Current plan</Badge>
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold leading-none">{PLACEHOLDER_STORAGE_USED}</span>
                    <span className="text-[13px] text-sunny-muted">of {PLACEHOLDER_STORAGE_TOTAL} used · {drivesCount} {drivesCount === 1 ? "drive" : "drives"}</span>
                </div>
                <div role="img" aria-label={`${PLACEHOLDER_STORAGE_PERCENT} percent of the storage used`} className="h-1 overflow-hidden rounded-full bg-[#e9e7df]">
                    <div className="h-full rounded-full bg-sunny-ink" style={{ width: `${PLACEHOLDER_STORAGE_PERCENT}%` }} />
                </div>
            </div>
            <a href={PRICING_URL} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full cursor-pointer items-center justify-center rounded-[10px] bg-sunny-yellow text-sm font-semibold text-sunny-ink outline-sunny-ink hover:bg-sunny-yellow-edge focus-visible:outline-2 focus-visible:outline-offset-2">
                Upgrade
            </a>
        </ProfileCard>
    );
}
