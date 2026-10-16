import { PRICING_URL } from "@/lib/site-links";
import { Badge, ProfileCard } from "./profile-parts";
import { formatBytes } from "@/components/drives/drive-stats-format";
import { useStorageUsage } from "@/hooks/use-storage-usage";
import { FREE_PLAN_STORAGE_BYTES, storagePercent } from "@/lib/storage-usage";

function driveCount(count: number) {
    return `${count} ${count === 1 ? "drive" : "drives"}`;
}

/** One line of the usage: what it is, how much, a bar, and a note under it. */
function UsageRow({ label, value, note, percent, ariaLabel }: { label: string; value: string; note: string; percent: number; ariaLabel: string }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-[13px] tabular-nums text-sunny-muted">{value}</span>
            </div>
            <div role="img" aria-label={ariaLabel} className="h-1 overflow-hidden rounded-full bg-[#e9e7df]">
                <div className="h-full rounded-full bg-sunny-ink" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs text-sunny-muted">{note}</span>
        </div>
    );
}

/**
 * The plan and the storage that the drives the user owns take. Owload's own storage (the S3 presets) is limited by the plan and has a bar
 * of its own; the user's own S3 is not limited, and has a bar of its own with its share of everything stored; the total is the two together.
 */
export function PlanCard() {
    const usage = useStorageUsage();
    const total = formatBytes(FREE_PLAN_STORAGE_BYTES);
    const more = usage && !usage.complete ? "+" : ""; // the server is still counting: what is shown is a part
    const preset = usage?.presetBytes ?? 0;
    const custom = usage?.customBytes ?? 0;
    const everything = preset + custom;
    const hasCustom = (usage?.customDrives ?? 0) > 0 || custom > 0;
    return (
        <ProfileCard title="Plan and storage">
            <div className="flex items-center gap-2.5">
                <span className="text-[19px] font-semibold">Free</span>
                <Badge>Current plan</Badge>
            </div>
            <UsageRow
                label="Owload storage"
                value={usage ? `${formatBytes(preset)}${more} of ${total}` : "—"}
                note={usage ? `What your drives hold in Owload's storage · ${driveCount(usage.presetDrives)}` : "Counting…"}
                percent={usage ? storagePercent(preset) : 0}
                ariaLabel={usage ? `${formatBytes(preset)} of ${total} of Owload storage used` : "Storage is being counted"}
            />
            {hasCustom && usage && (
                <>
                    <UsageRow
                        label="Your own S3"
                        value={`${formatBytes(custom)}${more}`}
                        note={`Not limited by the plan · ${driveCount(usage.customDrives)}`}
                        percent={storagePercent(custom, everything)}
                        ariaLabel={`${formatBytes(custom)} on your own S3, ${Math.round((custom / Math.max(everything, 1)) * 100)} percent of everything you store`}
                    />
                    <div className="flex items-baseline justify-between gap-2 border-t border-[#e9e7df] pt-3">
                        <span className="text-sm font-semibold">Total stored</span>
                        <span className="text-[15px] font-semibold tabular-nums">{formatBytes(everything)}{more}</span>
                    </div>
                </>
            )}
            <a href={PRICING_URL} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full cursor-pointer items-center justify-center rounded-[10px] bg-sunny-yellow text-sm font-semibold text-sunny-ink outline-sunny-ink hover:bg-sunny-yellow-edge focus-visible:outline-2 focus-visible:outline-offset-2">
                Upgrade
            </a>
        </ProfileCard>
    );
}
