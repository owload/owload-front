import { Check, TriangleAlert, X } from "lucide-react";
import { getColorClassname } from "../files-area/extension-badge";
import { calculateItemTransferProgressInfo } from "@/hooks/use-upload-progress";
import { useCancelUpload } from "@/hooks/use-upload";
import { cn, getExtension } from "@/lib/utils";
import { UploadQueueItem } from "@/types/types";

function readableSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const percentOf = (done: number, total: number) => (total > 0 ? Math.min(100, Math.floor(done / total * 100)) : 0);

function Stage({ label, percent, failed, done, active }: { label: string; percent: number; failed?: boolean; done: boolean; active: boolean }) {
    return (
        <div className="flex min-w-0 flex-col gap-[5px]">
            <div className="flex min-h-4 items-center justify-between gap-1.5 text-xs font-medium">
                <span className="text-[#cfcdc3]">{label}</span>
                {failed
                    ? <span className="text-[#ff9c8f]">Failed</span>
                    : done
                        ? <Check aria-label="Done" className="size-3.5 text-sunny-yellow" strokeWidth={3} />
                        : active && percent > 0 && <span className="text-sunny-yellow">{percent}%</span>}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-sunny-ink-track">
                <div
                    className={cn("h-full rounded-full transition-[width] duration-300", failed ? "bg-[#ff9c8f]" : "bg-sunny-yellow")}
                    style={{ width: `${done ? 100 : percent}%` }}
                />
            </div>
        </div>
    );
}

/** One file of the transfers panel: what it is, how far encryption and upload have got, and how to stop it. */
export function TransferItem({ item }: { item: UploadQueueItem }) {
    const cancelUpload = useCancelUpload();
    const info = calculateItemTransferProgressInfo(item);
    const extension = getExtension(item.file.name);
    const encrypted = percentOf(info.encrypted, info.total);
    const uploaded = percentOf(info.transferred, info.total);
    const failed = item.status === "ERROR";
    const finished = item.status === "FINISHED";
    const cancelled = item.status === "CANCELLED";
    const running = item.status === "PROGRESS";

    const note = failed
        ? <span className="text-[#ff9c8f]">Upload failed</span>
        : finished
            ? "Uploaded"
            : cancelled
                ? "Cancelled"
                : item.status === "QUEUED"
                    ? "Waiting"
                    : readableSize(item.file.size);

    return (
        <li className={cn("flex items-center gap-3 border-t border-sunny-ink-raised py-2.5", cancelled && "opacity-60")}>
            <span
                aria-hidden="true"
                className={cn("flex size-9 flex-none items-center justify-center rounded-[9px] text-[9px] font-bold uppercase tracking-[0.04em] text-white", getColorClassname(extension))}
            >
                {extension.slice(0, 4) || "file"}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
                <div className="flex items-baseline justify-between gap-2.5">
                    <span className="min-w-0 truncate text-sm font-semibold" title={item.file.name}>{item.file.name}</span>
                    <span className="flex-none text-[13px] text-[#cfcdc3]">{note}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Stage label="Encrypt" percent={encrypted} done={encrypted >= 100 || finished} active={running} failed={failed && encrypted < 100} />
                    <Stage label="Upload" percent={uploaded} done={finished} active={running} failed={failed && encrypted >= 100} />
                </div>
                {failed && item.errorMessage && (
                    <p role="alert" title={item.errorMessage} className="m-0 line-clamp-2 whitespace-pre-line text-xs leading-snug text-[#ff9c8f]">{item.errorMessage}</p>
                )}
            </div>
            {(item.status === "QUEUED" || running) && (
                <button
                    type="button"
                    aria-label={`Cancel ${item.file.name}`}
                    title={`Cancel ${item.file.name}`}
                    onClick={() => cancelUpload(item)}
                    className="flex size-9 flex-none cursor-pointer items-center justify-center rounded-[10px] text-[#cfcdc3] outline-sunny-yellow hover:bg-white/10 focus-visible:outline-2"
                >
                    <X className="size-[17px]" strokeWidth={2.2} />
                </button>
            )}
            {finished && <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center text-sunny-yellow"><Check className="size-[18px]" strokeWidth={2.6} /></span>}
            {failed && <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center text-[#ff9c8f]"><TriangleAlert className="size-[18px]" strokeWidth={2.2} /></span>}
        </li>
    );
}
