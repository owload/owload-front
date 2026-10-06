import { CloudUpload, FolderPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateFolderDialog } from "@/hooks/use-dialogs";
import { useUploadFile } from "@/hooks/use-upload-file";

/** What the files screen shows in a folder without files: what to do next. */
export function EmptyFilesArea() {
    const uploadFile = useUploadFile();
    const openCreateFolderDialog = useCreateFolderDialog();
    return (
        <div className="absolute inset-x-0 bottom-0 top-26 flex flex-col items-center justify-center gap-3.5 px-4 pb-28 pt-4 text-center">
            <span aria-hidden="true" className="flex size-[104px] items-center justify-center rounded-[28px] border-[1.5px] border-dashed border-sunny-line-strong bg-sunny-folder">
                <svg width="56" height="45" viewBox="0 0 80 64" className="block flex-none">
                    <path d="M4 12a6 6 0 0 1 6-6h17a4 4 0 0 1 3 1.4L35 13h35a6 6 0 0 1 6 6v8H4z" fill="var(--sunny-yellow-edge)" />
                    <rect x="4" y="19" width="72" height="41" rx="6" fill="var(--sunny-yellow)" />
                </svg>
            </span>
            <div className="flex max-w-[360px] flex-col gap-1.5">
                <h2 className="m-0 text-xl font-bold">Directory is empty</h2>
                <p className="m-0 text-muted-foreground">Upload files or create a folder to get started.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button className="gap-2.5 px-[18px]" onClick={() => uploadFile()} onPointerDown={(e) => e.stopPropagation()}>
                    <CloudUpload aria-hidden="true" className="size-[18px]" />Upload
                </Button>
                <Button variant="outline" className="gap-2.5 px-[18px]" onClick={() => openCreateFolderDialog({})} onPointerDown={(e) => e.stopPropagation()}>
                    <FolderPlus aria-hidden="true" className="size-[18px]" />Create folder
                </Button>
            </div>
            <p className="m-0 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Lock aria-hidden="true" className="size-[13px]" strokeWidth={2.4} />
                <span>Files are encrypted on this device before upload.</span>
            </p>
        </div>
    );
}
