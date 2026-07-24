import { useState } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { useFilesStore } from "@/stores/files-store";
import { DialogClosedError } from "@/types/errors";

export function CreateTextFileDialog() {
    const [fileName, setFileName] = useState('');
    const { uploadFile, pwd } = useFilesStoreOps();
    const setTextEditorOpen = useFilesStore((state) => state.setTextEditorOpen);
    const selectIds = useFilesStore((state) => state.selectIds);
    const closeDialog = useFsCloseDialogModal();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const name = fileName.trim();
        if (!name) return;
        const finalName = name.endsWith('.txt') ? name : name + '.txt';
        try {
            const file = new File([''], finalName, { type: 'text/plain' });
            const fileId = await uploadFile(file, pwd()!);
            selectIds([fileId]);
            setTextEditorOpen(true);
        } catch (e) {
            if (!(e instanceof DialogClosedError)) throw e;
        }
        closeDialog();
    }

    return (
        <DialogHeader>
            <DialogTitle>New text file</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogDescription>File name (.txt will be added if missing)</DialogDescription>
                <Input
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    placeholder="notes.txt"
                    autoFocus
                />
                <DialogFooter className="mt-4 sm:justify-end">
                    <Button type="submit" className="py-5" variant="default" disabled={!fileName.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </form>
        </DialogHeader>
    );
}
