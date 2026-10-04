import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { useFilesStore } from "@/stores/files-store";
import { registry } from "@/extensions/registry";
import { newFileName } from "@/components/editor-host/editor-host-messages";
import type { CreateEditorFileDialogProps } from "@/types/types";

/** "New <label>" of an editor extension: asks for a name, then opens the editor on a blank document. */
export function CreateEditorFileDialog({ extensionId }: CreateEditorFileDialogProps) {
    const entry = registry.byId(extensionId);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const setNewEditorFile = useFilesStore((state) => state.setNewEditorFile);
    const setEditorOpen = useFilesStore((state) => state.setEditorOpen);
    const closeDialog = useFsCloseDialogModal();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => { inputRef.current?.focus(); }, 0);
    }, []);

    if (!entry || !entry.extension.createNew) return null;
    const { extension } = entry;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const existing = useFilesStore.getState().fileObjects.map((f) => f.name);
        const result = newFileName(fileName, extension, existing);
        if (result.error !== undefined) {
            setError(result.error);
            return;
        }
        // The file is uploaded by the first Save in the editor, so cancelling leaves nothing behind.
        useFilesStore.getState().deselectAll();
        setNewEditorFile({ name: result.name, extensionId: extension.id });
        setEditorOpen(true);
        closeDialog();
    }

    return (
        <DialogHeader>
            <DialogTitle>New {extension.createNew!.label}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogDescription>File name (.{extension.createNew!.defaultExtension} will be added if missing)</DialogDescription>
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
