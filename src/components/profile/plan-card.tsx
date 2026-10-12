import { PRICING_URL } from "@/lib/site-links";
import { Badge, ProfileCard } from "./profile-parts";
import { formatBytes } from "@/components/drives/drive-stats-format";
import { useOwnedStorage } from "@/hooks/use-owned-storage";
import { FREE_PLAN_STORAGE_BYTES, storagePercent } from "@/lib/owned-storage";

/** The plan and how much of the storage is used: what the drives the user owns hold on the servers, out of the plan's fixed amount. */
export function PlanCard() {
    const storage = useOwnedStorage();
    const total = formatBytes(FREE_PLAN_STORAGE_BYTES);
    const percent = storage ? storagePercent(storage.usedBytes) : 0;
    const driveCount = storage?.driveCount ?? 0;
    return (
        <ProfileCard title="Plan and storage">
            <div className="flex items-center gap-2.5">
                <span className="text-[19px] font-semibold">Free</span>
                <Badge>Current plan</Badge>
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold leading-none tabular-nums">{storage ? `${formatBytes(storage.usedBytes)}${storage.complete ? "" : "+"}` : "—"}</span>
                    <span className="text-[13px] text-sunny-muted">of {total} used · {driveCount} {driveCount === 1 ? "drive you own" : "drives you own"}</span>
                </div>
                <div role="img" aria-label={storage ? `${formatBytes(storage.usedBytes)} of ${total} used by the drives you own` : "Storage is being counted"} className="h-1 overflow-hidden rounded-full bg-[#e9e7df]">
                    <div className="h-full rounded-full bg-sunny-ink" style={{ width: `${percent}%` }} />
                </div>
            </div>
            <a href={PRICING_URL} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full cursor-pointer items-center justify-center rounded-[10px] bg-sunny-yellow text-sm font-semibold text-sunny-ink outline-sunny-ink hover:bg-sunny-yellow-edge focus-visible:outline-2 focus-visible:outline-offset-2">
                Upgrade
            </a>
        </ProfileCard>
    );
}
