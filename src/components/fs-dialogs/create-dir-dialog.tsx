import { FolderPlus } from "lucide-react";
import { useId, useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { DialogHead } from "./dialog-parts";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";

export function CreateDirDialog() {
    const [dirName, setDirName] = useState("");
    const { mkdir } = useFilesStoreOps();
    const closeDialog = useFsCloseDialogModal();
    const inputRef = useRef<HTMLInputElement>(null);
    const fieldId = useId();

    useEffect(() => {
        setTimeout(() => { inputRef.current?.focus(); }, 0);
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        mkdir(dirName);
        closeDialog();
    }
    return (
        <form onSubmit={handleSubmit} className="m-0 flex flex-col gap-4">
            <DialogHead icon={FolderPlus} title="Create folder" subtitle="In the current folder" />

            <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId} className="text-[13px] font-semibold">Folder name</label>
                <Input id={fieldId} ref={inputRef} value={dirName} onChange={(e) => setDirName(e.target.value)} autoComplete="off" className="h-12" />
            </div>

            <DialogFooter className="flex-row justify-end gap-2">
                <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={() => closeDialog()}>Cancel</Button>
                <Button type="submit" className="h-11 gap-2 rounded-[10px] px-5">
                    <FolderPlus className="size-4" strokeWidth={2.2} aria-hidden="true" />
                    Create
                </Button>
            </DialogFooter>
        </form>
    );
}
