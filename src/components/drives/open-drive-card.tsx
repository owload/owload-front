import { DriveInfo } from "@/engine";
import { Folder, ListChecks, Lock, LockOpen, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { DriveIcon } from "./drive-icon";
import { DriveKind } from "./drive-kind";
import { PLACEHOLDER_FILE_COUNT, PLACEHOLDER_LAST_OPENED, PLACEHOLDER_TOTAL_SIZE, PLACEHOLDER_USED_PERCENT, PLACEHOLDER_USED_SIZE } from "./drive-placeholders";
import { useDriveActions } from "./use-drive-actions";

const iconButton = "flex size-12 flex-none cursor-pointer items-center justify-center rounded-xl text-sunny-ink outline-sunny-ink hover:bg-sunny-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2";

/** An open drive: the dark card at the top of the list, with what can be done with the drive. */
export function OpenDriveCard({ driveInfo, kind }: { driveInfo: DriveInfo, kind: DriveKind }) {
    const { passwordIsWrong, description, browse, close, tryAgain, settings, logs } = useDriveActions(driveInfo);
    const StateIcon = passwordIsWrong ? Lock : LockOpen;
    return (
        <article className="flex flex-col gap-[18px] rounded-[20px] bg-sunny-yellow-surface p-5 text-sunny-ink shadow-[0_24px_40px_-24px_rgba(26,26,25,0.55)] md:flex-row md:flex-wrap md:items-center md:gap-x-10 md:gap-y-6 md:p-6 md:shadow-[0_28px_48px_-28px_rgba(26,26,25,0.55)]">
            <div className="flex min-w-0 items-center gap-3.5 md:flex-[1_1_260px] md:gap-4">
                <div className="flex size-[52px] flex-none items-center justify-center rounded-[14px] bg-sunny-ink text-sunny-yellow md:size-14">
                    <DriveIcon driveInfo={driveInfo} className="size-6 md:size-[26px]" />
                </div>
                <div className="min-w-0">
                    <div className={cn("flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.08em]", passwordIsWrong ? "text-red-800" : "text-sunny-ink")}>
                        <StateIcon aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                        {passwordIsWrong ? "Wrong password" : `Open · ${kind === "shared" ? "Shared" : "Private"}`}
                    </div>
                    <h2 className="m-0 mt-0.5 break-words text-2xl font-bold leading-[1.2] tracking-[-0.02em] md:text-[26px]">{driveInfo.title}</h2>
                    <div className="text-sunny-text-on-yellow">{description || "—"}</div>
                </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 md:flex-[1_1_280px]">
                {passwordIsWrong ? (
                    <div className="flex items-baseline gap-2">
                        <span className="text-[30px] font-extrabold leading-none tracking-[-0.02em]">{PLACEHOLDER_TOTAL_SIZE}</span>
                        <span className="text-sunny-text-on-yellow">total · contents hidden</span>
                    </div>
                ) : (<>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[30px] font-extrabold leading-none tracking-[-0.02em]">{PLACEHOLDER_USED_SIZE}</span>
                        <span className="text-sunny-text-on-yellow">of {PLACEHOLDER_TOTAL_SIZE} · {PLACEHOLDER_FILE_COUNT} files</span>
                    </div>
                    <div role="img" aria-label={`${PLACEHOLDER_USED_PERCENT} percent of the drive is used`} className="h-1.5 overflow-hidden rounded-[3px] bg-sunny-ink/20">
                        <div className="h-full rounded-[3px] bg-sunny-ink" style={{ width: `${PLACEHOLDER_USED_PERCENT}%` }} />
                    </div>
                </>)}
                <div className="text-[13px] text-sunny-text-on-yellow">Last opened {PLACEHOLDER_LAST_OPENED}</div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
                {passwordIsWrong
                    ? <button type="button" onClick={tryAgain} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-sunny-ink px-5 font-bold text-sunny-yellow hover:bg-sunny-ink-raised md:justify-start">Try again</button>
                    : <button type="button" onClick={browse} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-sunny-ink px-5 font-bold text-sunny-yellow hover:bg-sunny-ink-raised md:justify-start">
                        <Folder aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />Browse files
                    </button>}
                <div className="flex items-center gap-2">
                    <button type="button" onClick={close} className="h-12 flex-1 cursor-pointer rounded-xl border-2 border-sunny-ink px-[18px] font-bold hover:bg-sunny-ink/10 md:flex-none">Close drive</button>
                    {!passwordIsWrong && <>
                        <button type="button" aria-label="Settings" title="Settings" onClick={settings} className={iconButton}>
                            <SlidersHorizontal aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                        </button>
                        <button type="button" aria-label="View logs" title="View logs" onClick={logs} className={iconButton}>
                            <ListChecks aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                        </button>
                    </>}
                </div>
            </div>
        </article>
    );
}
