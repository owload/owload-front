import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { RenameDialogProps } from "@/types/types";
import { joinPath } from "@/lib/utils";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";

export function RenameDialog({ pathSrc, originalName }: RenameDialogProps) {
    const [newName, setNewName] = useState(originalName);
    const inputRef = useRef<HTMLInputElement>(null);
    const { rename } = useFilesStoreOps();
    const closeDialog = useFsCloseDialogModal();

    useEffect(() => {
        if (inputRef.current) {
            const dotIdx = originalName.lastIndexOf(".");
            inputRef.current.focus();
            if (dotIdx > 0) {
                setTimeout(() => {
                    inputRef.current && inputRef.current.setSelectionRange(0, dotIdx);
                }, 0);
            } else {
                setTimeout(() => {
                    inputRef.current && inputRef.current.select();
                }, 0);
            }
        }
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
        <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogDescription>Input new name</DialogDescription>
                <Input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <DialogFooter className="mt-4 sm:justify-end">
                    <Button type="submit" className="py-5" variant={'default'}>Rename</Button>
                </DialogFooter>
            </form>
        </DialogHeader>
    );
}
