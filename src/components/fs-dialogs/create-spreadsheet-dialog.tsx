import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { useFilesStore } from "@/stores/files-store";
import { newSpreadsheetFileName } from "@/components/spreadsheet-editor/spreadsheet-messages";

export function CreateSpreadsheetDialog() {
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const setNewSpreadsheetName = useFilesStore((state) => state.setNewSpreadsheetName);
    const setSpreadsheetEditorOpen = useFilesStore((state) => state.setSpreadsheetEditorOpen);
    const closeDialog = useFsCloseDialogModal();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => { inputRef.current?.focus(); }, 0);
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const existing = useFilesStore.getState().fileObjects.map((f) => f.name);
        const result = newSpreadsheetFileName(fileName, existing);
        if (result.error !== undefined) {
            setError(result.error);
            return;
        }
        // The file is uploaded by the first Save in the editor, so cancelling leaves nothing behind.
        useFilesStore.getState().deselectAll();
        setNewSpreadsheetName(result.name);
        setSpreadsheetEditorOpen(true);
        closeDialog();
    }

    return (
        <DialogHeader>
            <DialogTitle>New spreadsheet</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogDescription>File name (.xlsx will be added if missing)</DialogDescription>
                <Input
                    ref={inputRef}
                    value={fileName}
                    onChange={e => { setFileName(e.target.value); setError(null); }}
                />
                {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
                <DialogFooter className="mt-4 sm:justify-end">
                    <Button type="submit" className="py-5" variant="default" disabled={!fileName.trim()}>
                        Create
                    </Button>
                </DialogFooter>
            </form>
        </DialogHeader>
    );
}
