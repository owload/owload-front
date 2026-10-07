import { ArrowUp, ChevronDown, ChevronUp, Check, Lock, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TransferItem } from "./transfer-item";
import { TransferRing } from "./transfer-ring";
import { filterLastProgressThresholdItems, useIsAllTransferFinished, useTotalTransferProgress, useUploadErrorCount } from "@/hooks/use-upload-progress";
import { useDeactivateMobileSelectMode } from "@/hooks/use-mobile-select-mode";
import { useUploadFile } from "@/hooks/use-upload-file";
import { cn } from "@/lib/utils";
import { useFilesStore } from "@/stores/files-store";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The transfers of the dock: a button that tells how the uploads are going and, opened, the panel above the dock with
 * every file, its two stages (encrypt on this device, then upload) and how to stop it.
 */
export function TransfersTray() {
    const uploadQueue = useFilesStore((state) => state.uploadQueue);
    const setUploadQueue = useFilesStore((state) => state.setUploadQueue);
    const totalProgress = useTotalTransferProgress()();
    const allFinished = useIsAllTransferFinished();
    const errorCount = useUploadErrorCount();
    const batchSize = filterLastProgressThresholdItems(uploadQueue).length;
    const deactivateMobileSelectMode = useDeactivateMobileSelectMode();
    const uploadFile = useUploadFile();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    if (uploadQueue.length === 0) return null;

    const failed = allFinished && errorCount > 0;
    const count = plural(uploadQueue.length, "file", "files");
    const percent = allFinished ? 100 : totalProgress;
    const label = failed ? `${errorCount} failed` : allFinished ? "Uploaded" : `${count} · ${totalProgress}%`;
    const ariaLabel = failed ? `Uploads, ${errorCount} failed` : allFinished ? "Uploads, finished" : `Uploads, ${count} · ${totalProgress}%`;

    const clearFinished = () => {
        setUploadQueue([]);
        setOpen(false);
    };
    const addFiles = () => {
        deactivateMobileSelectMode();
        uploadFile();
    };

    return (
        <div ref={rootRef} className="contents" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <button
                type="button"
                aria-expanded={open}
                aria-label={ariaLabel}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "flex h-11 cursor-pointer items-center gap-2 rounded-xl border-0 pl-2.5 pr-2.5 text-sm font-semibold outline-sunny-yellow focus-visible:outline-2",
                    failed ? "bg-[#b3261e] pl-3 text-white" : open ? "bg-sunny-yellow text-sunny-ink" : "bg-sunny-ink-raised text-white hover:bg-[#3a3832]"
                )}
            >
                {failed
                    ? <TriangleAlert className="size-4" strokeWidth={2.4} aria-hidden="true" />
                    : <>
                        <TransferRing
                            size={26}
                            stroke={3.5}
                            percent={percent}
                            trackClass={open ? "stroke-[#d9b93a]" : "stroke-sunny-ink-track"}
                            barClass={open ? "stroke-sunny-ink" : "stroke-sunny-yellow"}
                        />
                        {allFinished
                            ? <Check className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
                            : <ArrowUp className="size-3.5" strokeWidth={2.6} aria-hidden="true" />}
                    </>}
                <span>{label}</span>
                {open ? <ChevronDown className="size-4" strokeWidth={2.4} aria-hidden="true" /> : <ChevronUp className="size-4" strokeWidth={2.4} aria-hidden="true" />}
            </button>

            {open && (
                <div
                    role="region"
                    aria-label="Transfers"
                    className="absolute bottom-[calc(100%+10px)] right-0 z-40 flex w-[420px] max-w-[calc(100vw-32px)] flex-col gap-3.5 rounded-2xl bg-sunny-ink px-4 pb-3 pt-4 text-left text-white shadow-[0_18px_44px_rgba(0,0,0,0.30)]"
                >
                    <div className="flex items-center gap-3">
                        {failed
                            ? <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-xl bg-[#4a2320] text-[#ff9c8f]"><TriangleAlert className="size-5" strokeWidth={2.2} /></span>
                            : <TransferRing size={40} stroke={4.5} percent={percent} trackClass="stroke-sunny-ink-track" barClass="stroke-sunny-yellow" />}
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="text-base font-semibold">
                                {failed
                                    ? `${errorCount} of ${plural(batchSize, "upload", "uploads")} failed`
                                    : `${allFinished ? "Uploaded" : "Uploading"} ${count}`}
                            </span>
                            <span className="flex items-center gap-1.5 text-[13px] text-[#cfcdc3]">
                                {failed
                                    ? <span>The reason is shown under each file</span>
                                    : <><Lock className="size-3 flex-none text-sunny-yellow" strokeWidth={2.2} aria-hidden="true" /><span>Encrypted on this device, then uploaded</span></>}
                            </span>
                        </div>
                        <button
                            type="button"
                            aria-label="Hide transfers"
                            title="Hide transfers"
                            onClick={() => setOpen(false)}
                            className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-[10px] text-white outline-sunny-yellow hover:bg-white/10 focus-visible:outline-2"
                        >
                            <ChevronDown className="size-[17px]" strokeWidth={2.2} />
                        </button>
                    </div>

                    <ul className="m-0 flex max-h-[min(50vh,360px)] list-none flex-col overflow-y-auto p-0">
                        {uploadQueue.map((item) => <TransferItem key={item.uploadId} item={item} />)}
                    </ul>

                    <div className="flex items-center justify-between gap-3 border-t border-sunny-ink-raised pt-3">
                        <button
                            type="button"
                            onClick={addFiles}
                            className="flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-sunny-yellow bg-transparent px-3.5 text-sm font-semibold text-sunny-yellow outline-sunny-yellow hover:bg-sunny-yellow/10 focus-visible:outline-2"
                        >
                            <Plus className="size-4" strokeWidth={2.4} aria-hidden="true" />
                            <span>Add files</span>
                        </button>
                        <button
                            type="button"
                            disabled={!allFinished}
                            onClick={clearFinished}
                            className="h-10 cursor-pointer border-0 bg-transparent px-1.5 text-sm font-medium text-[#cfcdc3] underline underline-offset-[3px] outline-sunny-yellow focus-visible:outline-2 disabled:cursor-default disabled:no-underline disabled:opacity-40"
                        >
                            Clear finished
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
