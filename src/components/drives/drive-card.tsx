import { DriveInfo } from "@/engine";
import { Folder, ListChecks, Lock, LockOpen, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { DriveIcon } from "./drive-icon";
import { DRIVE_KIND_LABEL, DriveKind } from "./drive-kind";
import { formatBytes, formatDateTime, usedPercent } from "./drive-stats-format";
import { useDriveActions } from "./use-drive-actions";

const iconButton = "flex size-11 flex-none cursor-pointer items-center justify-center rounded-[10px] text-sunny-ink outline-sunny-ink hover:bg-sunny-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2";
const textButton = "flex h-11 cursor-pointer items-center gap-2 rounded-[10px] px-4 font-semibold max-md:px-2.5 outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * A drive of the list. An open drive is the yellow card with its size and bar and what can be done with it; a closed
 * one is a white card of the same shape that shows only what is known while the drive is closed.
 */
export function DriveCard({ driveInfo, kind }: { driveInfo: DriveInfo, kind: DriveKind }) {
    const { driveOpen, passwordIsWrong, description, fileCount, usedBytes, browse, close, tryAgain, settings, logs } = useDriveActions(driveInfo);
    const showsContents = driveOpen && !passwordIsWrong;
    const percent = usedPercent(usedBytes, driveInfo.storedBytes);
    const stored = driveInfo.storedBytes == null ? "…" : formatBytes(driveInfo.storedBytes); // the server is still counting
    const kindLabel = DRIVE_KIND_LABEL[kind];
    // What a drive that someone shared with me tells while it is closed: who shared it and what I may do on it.
    const sharedBy = kind === "with-me"
        ? `Shared by ${driveInfo.ownerName || driveInfo.ownerEmail || "its owner"} · ${driveInfo.myRole[0].toUpperCase()}${driveInfo.myRole.slice(1)}`
        : undefined;
    const StateIcon = showsContents ? LockOpen : Lock;
    const stateLabel = passwordIsWrong ? "Wrong password" : showsContents ? `Open · ${kindLabel}` : `Closed · ${kindLabel}`;

    return (
        <article
            onClick={browse}
            className={cn(
                "relative flex cursor-pointer flex-wrap items-center gap-x-10 gap-y-3 rounded-2xl text-sunny-ink",
                showsContents
                    ? "bg-sunny-yellow-surface py-4 pl-[18px] pr-2.5 shadow-[0_14px_32px_rgba(0,0,0,0.14)]"
                    : "border bg-white py-[15px] pl-[17px] pr-[9px] shadow-[0_6px_18px_rgba(0,0,0,0.06)]",
                !showsContents && (passwordIsWrong ? "border-destructive" : "border-sunny-line"),
            )}
        >
            <div className="flex min-w-0 flex-[1_1_260px] items-center gap-3.5">
                <span aria-hidden="true" className={cn("flex size-11 flex-none items-center justify-center rounded-xl", showsContents ? "bg-sunny-ink text-sunny-yellow" : "bg-sunny-field text-sunny-ink")}>
                    <DriveIcon driveInfo={driveInfo} className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                    <span className={cn("flex items-center gap-[5px] text-[11px] font-semibold uppercase tracking-[0.08em]", passwordIsWrong ? "text-destructive" : showsContents ? "text-sunny-text-on-yellow" : "text-sunny-muted")}>
                        <StateIcon aria-hidden="true" className="size-3" strokeWidth={2.2} />
                        <span>{stateLabel}</span>
                    </span>
                    <h2 className="m-0 truncate text-[19px] font-semibold leading-tight">{driveInfo.title}</h2>
                    <span className={cn("truncate text-[13px]", showsContents ? "text-sunny-text-on-yellow" : "text-sunny-muted")}>
                        {showsContents ? (description || "—") : sharedBy ?? "Description hidden while closed"}
                    </span>
                </div>
            </div>

            <div className="flex min-w-0 max-w-[460px] flex-[1_1_300px] flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold leading-none">{showsContents && usedBytes !== undefined ? formatBytes(usedBytes) : stored}</span>
                    <span className={cn("text-[13px]", showsContents ? "text-sunny-text-on-yellow" : "text-sunny-muted")}>
                        {showsContents
                            ? (fileCount !== undefined ? `in ${fileCount} ${fileCount === 1 ? "file" : "files"} · ${stored} stored` : `${stored} stored`)
                            : "stored · contents hidden while closed"}
                    </span>
                </div>
                {showsContents && percent !== undefined ? (
                    <div role="img" aria-label={`Files take ${percent} percent of the ${stored} stored on the servers`} title="Files take this much of what is stored; the rest is old versions and previews" className="h-1 overflow-hidden rounded-full bg-sunny-ink/20">
                        <div className="h-full rounded-full bg-sunny-ink" style={{ width: `${percent}%` }} />
                    </div>
                ) : <div aria-hidden="true" className={cn("h-1 rounded-full", showsContents ? "bg-sunny-ink/20" : "bg-sunny-line")} />}
                <span title="By anyone: you, the people it is shared with, or a visitor of its public link" className={cn("text-xs", showsContents ? "text-sunny-text-on-yellow" : "text-sunny-muted")}>
                    {driveInfo.lastReadAt ? `Last read ${formatDateTime(driveInfo.lastReadAt)}` : "Not read yet"}
                </span>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 max-md:gap-1 md:ml-auto md:w-auto md:flex-none" onClick={(e) => e.stopPropagation()}>
                {passwordIsWrong && <>
                    <button type="button" onClick={tryAgain} className={cn(textButton, "bg-sunny-ink text-sunny-yellow hover:bg-sunny-ink/90")}>Try again</button>
                    <button type="button" onClick={close} className={cn(textButton, "border border-sunny-ink hover:bg-sunny-ink/10")}>Close drive</button>
                </>}
                {showsContents && <>
                    <button type="button" onClick={browse} className={cn(textButton, "bg-sunny-ink text-sunny-yellow hover:bg-sunny-ink/90")}>
                        <Folder aria-hidden="true" className="size-4" strokeWidth={2} />Browse files
                    </button>
                    <button type="button" onClick={close} className={cn(textButton, "border border-sunny-ink hover:bg-sunny-ink/10")}>Close drive</button>
                </>}
                {!driveOpen && (
                    <button type="button" onClick={browse} className={cn(textButton, "bg-sunny-yellow px-[18px] hover:bg-sunny-yellow-edge")}>
                        <LockOpen aria-hidden="true" className="size-4" strokeWidth={2} />Open drive
                    </button>
                )}
                {!passwordIsWrong && <>
                    <button type="button" aria-label={`Drive settings for ${driveInfo.title}`} title="Drive settings" onClick={settings} className={iconButton}>
                        <SlidersHorizontal aria-hidden="true" className="size-[18px]" strokeWidth={2} />
                    </button>
                    <button type="button" aria-label={`View logs for ${driveInfo.title}`} title="View logs" onClick={logs} className={iconButton}>
                        <ListChecks aria-hidden="true" className="size-[18px]" strokeWidth={2} />
                    </button>
                </>}
            </div>
        </article>
    );
}
