import { FilePlus } from "lucide-react";
import { useId, useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { DialogHead } from "./dialog-parts";
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
    const fieldId = useId();

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
        <form onSubmit={handleSubmit} className="m-0 flex flex-col gap-4">
            <DialogHead icon={FilePlus} title={`New ${extension.createNew!.label}`} subtitle="Saved to the current folder when you save it in the editor" />

            <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId} className="text-[13px] font-semibold">File name</label>
                <Input
                    id={fieldId}
                    ref={inputRef}
                    value={fileName}
                    onChange={e => { setFileName(e.target.value); setError(null); }}
                    autoComplete="off"
                    aria-invalid={error ? true : undefined}
                    className="h-12"
                />
                {error
                    ? <p role="alert" className="m-0 text-xs leading-normal text-[#b3261e]">{error}</p>
                    : <p className="m-0 text-xs leading-normal text-muted-foreground">.{extension.createNew!.defaultExtension} will be added if missing.</p>}
            </div>

            <DialogFooter className="flex-row justify-end gap-2">
                <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={() => closeDialog()}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-[10px] px-5" disabled={!fileName.trim()}>Create</Button>
            </DialogFooter>
        </form>
    );
}
