import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFilesStore } from "@/stores/files-store";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { DialogClosedError } from "@/types/errors";

export function TextEditor() {
    const { getFileData, saveFile, pwd, closeSelectedObject } = useFilesStoreOps();
    const setTextEditorOpen = useFilesStore((state) => state.setTextEditorOpen);
    const selectIds = useFilesStore((state) => state.selectIds);
    const selectedFileObjects = useSelectedFileObjects();
    const file = selectedFileObjects[0];

    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmClose, setConfirmClose] = useState(false);

    const isDirty = content !== originalContent;

    useEffect(() => {
        if (!file) return;
        setLoading(true);
        setError(null);
        if (!file.byteLength) {
            setContent('');
            setOriginalContent('');
            setLoading(false);
            return;
        }
        getFileData(file).then(data => {
            const text = new TextDecoder().decode(data);
            setContent(text);
            setOriginalContent(text);
        }).catch(e => {
            setError(e instanceof Error ? e.message : String(e));
        }).finally(() => setLoading(false));
    }, [file?.id]);

    const handleSave = async () => {
        if (!file || saving) return;
        setSaving(true);
        setError(null);
        try {
            const blob = new File([content], file.name, { type: 'text/plain' });
            const newFileId = await saveFile(blob, pwd()!);
            selectIds([newFileId]);
            setOriginalContent(content);
        } catch (e) {
            if (!(e instanceof DialogClosedError)) {
                setError(e instanceof Error ? e.message : String(e));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRef = useRef(handleSave);
    handleSaveRef.current = handleSave;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveRef.current();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const doClose = () => {
        setTextEditorOpen(false);
        closeSelectedObject();
    };

    const handleClose = () => {
        if (isDirty) {
            setConfirmClose(true);
        } else {
            doClose();
        }
    };

    const handleSaveAndClose = async () => {
        setConfirmClose(false);
        await handleSave();
        doClose();
    };

    if (!file) return null;

    return (
        <>
            <Dialog open={confirmClose} onOpenChange={(open) => !open && setConfirmClose(false)}>
                <DialogContent className="z-[200]">
                    <DialogHeader>
                        <DialogTitle>Unsaved changes</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">Save before closing?</p>
                    <DialogFooter className="gap-2">
                        <Button variant="black" onClick={() => setConfirmClose(false)}>Cancel</Button>
                        <Button variant="secondary" onClick={() => { setConfirmClose(false); doClose(); }}>Discard</Button>
                        <Button onClick={handleSaveAndClose} disabled={saving}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="fixed inset-0 z-150 bg-white flex flex-col">
                <div className="flex items-center gap-3 px-4 h-12 border-b shrink-0">
                    <span className="font-medium text-sm truncate flex-1">{file.name}</span>
                    {isDirty && <span className="text-xs text-amber-500 shrink-0">● Unsaved changes</span>}
                    <Button
                        size="sm"
                        variant="default"
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="shrink-0"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <X size={20} onClick={handleClose} className="cursor-pointer text-gray-500 hover:text-gray-900 shrink-0" />
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                    {loading && (
                        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">Loading…</div>
                    )}
                    {!loading && error && (
                        <div className="p-4 text-red-500 text-sm">{error}</div>
                    )}
                    {!loading && !error && (
                        <textarea
                            className="flex-1 resize-none p-4 outline-none font-mono text-sm"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            spellCheck={false}
                            autoFocus
                        />
                    )}
                </div>
            </div>
        </>
    );
}
