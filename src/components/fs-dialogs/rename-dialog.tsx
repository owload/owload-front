import { Pencil } from "lucide-react";
import { useId, useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { DialogHead } from "./dialog-parts";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { RenameDialogProps } from "@/types/types";
import { joinPath } from "@/lib/utils";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";

export function RenameDialog({ pathSrc, originalName }: RenameDialogProps) {
    const [newName, setNewName] = useState(originalName);
    const inputRef = useRef<HTMLInputElement>(null);
    const { rename } = useFilesStoreOps();
    const closeDialog = useFsCloseDialogModal();
    const fieldId = useId();

    useEffect(() => {
        const dotIdx = originalName.lastIndexOf(".");
        setTimeout(() => {
            if (!inputRef.current) return;
            inputRef.current.focus();
            if (dotIdx > 0) {
                inputRef.current.setSelectionRange(0, dotIdx);
            } else {
                inputRef.current.select();
            }
        }, 0);
    }, [originalName]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if( newName.trim() === "" || newName === originalName) {
            closeDialog();
            return;
        }
        rename(joinPath(pathSrc, originalName), joinPath(pathSrc, newName));
        closeDialog();
    }
    return (
        <form onSubmit={handleSubmit} className="m-0 flex flex-col gap-4">
            <DialogHead icon={Pencil} title="Rename" subtitle={<b className="break-all font-semibold text-foreground">{originalName}</b>} />

            <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId} className="text-[13px] font-semibold">New name</label>
                <Input id={fieldId} ref={inputRef} value={newName} onChange={(e) => setNewName(e.target.value)} autoComplete="off" className="h-12" />
            </div>

            <DialogFooter className="flex-row justify-end gap-2">
                <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={() => closeDialog()}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-[10px] px-5">Rename</Button>
            </DialogFooter>
        </form>
    );
}
