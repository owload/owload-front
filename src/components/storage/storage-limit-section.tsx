import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/components/drives/drive-stats-format";
import { RestDriveBackend, type DriveInfo } from "@/engine";
import { useStorageUsage } from "@/hooks/use-storage-usage";
import { LIMIT_UNITS, parseLimit, splitLimit, type LimitUnit } from "@/lib/storage-limit";
import { describeApiError } from "@/engine/api/api-error";

interface Props {
    driveInfo: DriveInfo;
    onChanged: (info: DriveInfo) => void;
}

/**
 * The owner's limit of one drive: how much it may hold (by what the card shows as its size). Without one, only the owner's storage holds the
 * drive. Whoever writes to the drive is held by this limit and by the owner's (decisions/0036); a limit lower than what the drive holds
 * stops new writes and removes nothing.
 */
export function StorageLimitSection({ driveInfo, onChanged }: Props) {
    const usage = useStorageUsage();
    const current = driveInfo.storageLimitBytes;
    const initial = current === null ? undefined : splitLimit(current);
    const [limited, setLimited] = useState(current !== null);
    const [text, setText] = useState(initial?.text ?? "");
    const [unit, setUnit] = useState<LimitUnit>(initial?.unit ?? "GB");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const wanted = limited ? parseLimit(text, unit) : null;
    const changed = wanted !== undefined && wanted !== current;
    const stored = driveInfo.storedBytes;
    const room = usage ? Math.max(0, usage.limitBytes - usage.presetBytes) : undefined;

    async function save() {
        if (wanted === undefined) return;
        setBusy(true);
        setError(undefined);
        try {
            const info = await new RestDriveBackend().setStorageLimit(driveInfo.id, wanted);
            onChanged(info);
        } catch (e) {
            setError(describeApiError(e, "The limit could not be saved."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="space-y-4 rounded-2xl border border-sunny-line bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
            <h2 className="m-0 text-[17px] font-semibold">Storage limit</h2>
            <p className="m-0 text-sm text-muted-foreground">
                {stored === null ? "Counting what the drive holds…" : `The drive holds ${formatBytes(stored)}.`}
                {" "}Everyone who writes to it is held by this limit and by yours.
            </p>
            <div role="radiogroup" aria-label="Storage limit of this drive" className="flex flex-col gap-3">
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input type="radio" name="limit" className="mt-1 accent-sunny-ink" checked={!limited} onChange={() => { setLimited(false); setError(undefined); }} />
                    <span>
                        <span className="font-semibold">No limit of its own</span>
                        <span className="block text-xs text-muted-foreground">
                            Only your storage holds it{room !== undefined ? `: ${formatBytes(room)} of ${formatBytes(usage!.limitBytes)} are free now` : ""}.
                        </span>
                    </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input type="radio" name="limit" className="mt-1 accent-sunny-ink" checked={limited} onChange={() => { setLimited(true); setError(undefined); }} />
                    <span className="font-semibold">Limit this drive to</span>
                </label>
                {limited && (
                    <div className="ml-6 flex flex-wrap items-center gap-2">
                        <Input
                            inputMode="decimal"
                            aria-label="Limit"
                            aria-invalid={text !== "" && wanted === undefined}
                            className="h-10 w-28"
                            value={text}
                            onChange={(event) => { setText(event.target.value); setError(undefined); }}
                            placeholder="5"
                        />
                        <select
                            aria-label="Unit"
                            className="h-10 cursor-pointer rounded-md border border-sunny-line bg-white px-2 text-sm"
                            value={unit}
                            onChange={(event) => setUnit(event.target.value as LimitUnit)}
                        >
                            {LIMIT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {text !== "" && wanted === undefined && <span className="text-xs text-[#b3261e]">At least 1 MB</span>}
                    </div>
                )}
            </div>
            {error && <p role="alert" className="m-0 text-sm text-[#b3261e]">{error}</p>}
            <div className="flex items-center gap-3">
                <Button size="sm" disabled={busy || !changed} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</Button>
                {!changed && current !== null && <span className="text-xs text-muted-foreground">Limit: {formatBytes(current)}</span>}
            </div>
        </section>
    );
}
