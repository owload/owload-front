import { DriveInfo } from "@/engine";
import { ListChecks, LockOpen, SlidersHorizontal } from "lucide-react";
import { DriveIcon } from "./drive-icon";
import { PLACEHOLDER_LAST_OPENED, PLACEHOLDER_TOTAL_SIZE } from "./drive-placeholders";
import { useDriveActions } from "./use-drive-actions";

const iconButton = "flex size-11 flex-none cursor-pointer items-center justify-center rounded-[10px] text-sunny-ink outline-sunny-ink hover:bg-sunny-field focus-visible:outline-2 focus-visible:outline-offset-2";

/** A closed drive: one row of the list below the open ones. */
export function ClosedDriveRow({ driveInfo }: { driveInfo: DriveInfo }) {
    const { browse, settings, logs } = useDriveActions(driveInfo);
    return (
        <article className="flex flex-col gap-2.5 rounded-[14px] border border-sunny-line bg-white p-3 md:flex-row md:flex-wrap md:items-center md:gap-x-5 md:gap-y-2.5 md:py-2.5 md:pl-3.5 md:pr-3">
            <div className="flex min-w-0 items-center gap-3 md:flex-[1_1_240px] md:gap-3.5">
                <div className="flex size-11 flex-none items-center justify-center rounded-[10px] bg-sunny-field">
                    <DriveIcon driveInfo={driveInfo} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="m-0 truncate text-base font-semibold leading-[1.3]">{driveInfo.title}</h3>
                    <div className="truncate text-[13px] text-sunny-muted">Last opened {PLACEHOLDER_LAST_OPENED}</div>
                </div>
                <div className="flex-none self-start font-medium md:hidden">{PLACEHOLDER_TOTAL_SIZE}</div>
            </div>
            <div className="hidden w-[72px] flex-none font-medium md:block">{PLACEHOLDER_TOTAL_SIZE}</div>
            <div className="flex items-center gap-1.5 md:ml-auto">
                <button type="button" onClick={browse} className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-sunny-ink px-4 font-bold text-sunny-ink outline-ring hover:bg-sunny-ink hover:text-sunny-yellow focus-visible:outline-2 focus-visible:outline-offset-2 md:flex-none">
                    <LockOpen aria-hidden="true" className="size-4" strokeWidth={1.8} />Open drive
                </button>
                <button type="button" aria-label="Settings" title="Settings" onClick={settings} className={iconButton}>
                    <SlidersHorizontal aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                </button>
                <button type="button" aria-label="View logs" title="View logs" onClick={logs} className={iconButton}>
                    <ListChecks aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                </button>
            </div>
        </article>
    );
}
