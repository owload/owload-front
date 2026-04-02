import { useState } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";

export function CreateDirDialog() {
    const [dirName, setDirName] = useState("");
    const { mkdir } = useFilesStoreOps();
    const closeDialog = useFsCloseDialogModal();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        mkdir(dirName);
        closeDialog();
    }
    return (
        <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogDescription>Input name of new folder</DialogDescription>
                <Input value={dirName} onChange={(e) => setDirName(e.target.value)} />
                <DialogFooter className="mt-4 sm:justify-end">
                    <Button type="submit" className="py-5" variant={'default'}>Create</Button>
                </DialogFooter>
            </form>
        </DialogHeader>
    );
}
