import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { XlsxEditor, type XlsxEditorHandle } from "@owload/xlsx-editor";
import "@owload/xlsx-editor/style.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFilesStore } from "@/stores/files-store";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { DialogClosedError } from "@/types/errors";
import { SPREADSHEET_MIME_TYPE, LOSSY_SAVE_NOTICE } from "./spreadsheet-messages";

/**
 * Opens an .xlsx file of the drive in the @owload/xlsx-editor package
 * (owload-docs/decisions/0018, epic 0023). The file is decrypted here, handed
 * to the editor as bytes and handed back through onSave, which uploads it as an
 * ordinary REPLACE like the text editor does. The editor makes no network
 * requests, and its copy/paste stays inside it (internalClipboardOnly).
 *
 * A spreadsheet that is being created (newSpreadsheetName) is not in the drive
 * yet: it is uploaded by the first Save, so closing without saving leaves no
 * empty file behind.
 */
export function SpreadsheetEditor() {
    const { getFileData, saveFile, pwd, closeSelectedObject } = useFilesStoreOps();
    const setSpreadsheetEditorOpen = useFilesStore((state) => state.setSpreadsheetEditorOpen);
    const newSpreadsheetName = useFilesStore((state) => state.newSpreadsheetName);
    const setNewSpreadsheetName = useFilesStore((state) => state.setNewSpreadsheetName);
    const selectIds = useFilesStore((state) => state.selectIds);
    const selectedFileObjects = useSelectedFileObjects();

    // What was opened is fixed at mount: after the first save of a new
    // spreadsheet or a re-sync the selection changes, but the editor must stay.
    const [opened] = useState(() => ({
        file: newSpreadsheetName ? undefined : selectedFileObjects[0],
        name: newSpreadsheetName ?? selectedFileObjects[0]?.name,
    }));
    const { file, name } = opened;
    const isNew = newSpreadsheetName !== null;

    const [data, setData] = useState<Uint8Array | null>(null);
    const [loading, setLoading] = useState(!!file);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);
    const [noticeVisible, setNoticeVisible] = useState(!!file);
    const editorRef = useRef<XlsxEditorHandle>(null);

    useEffect(() => {
        if (!file) return;
        if (!file.byteLength) {
            setLoading(false); // an empty file starts a blank workbook
            return;
        }
        let cancelled = false;
        getFileData(file).then((bytes) => {
            if (!cancelled) setData(bytes);
        }).catch((e) => {
            if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [file?.id]);

    const handleSave = async (bytes: Uint8Array) => {
        setSaving(true);
        try {
            const upload = new File([new Uint8Array(bytes)], name!, { type: SPREADSHEET_MIME_TYPE });
            const newFileId = await saveFile(upload, pwd()!);
            selectIds([newFileId]);
            setNoticeVisible(false);
        } catch (e) {
            if (e instanceof DialogClosedError) return;
            throw e; // the editor shows it and keeps the document dirty
        } finally {
            setSaving(false);
        }
    };

    const doClose = () => {
        setSpreadsheetEditorOpen(false);
        setNewSpreadsheetName(null);
        // A new spreadsheet that was never saved has nothing selected to go back from.
        if (useFilesStore.getState().fileObjects.some((f) => f.selected)) {
            closeSelectedObject();
        }
    };

    const handleClose = () => {
        if (dirty) {
            setConfirmClose(true);
        } else {
            doClose();
        }
    };

    const handleSaveAndClose = async () => {
        setConfirmClose(false);
        try {
            await editorRef.current?.save();
        } catch {
            return; // the editor shows the error; stay open so nothing is lost
        }
        if (!editorRef.current?.isDirty()) doClose();
    };

    if (!name) return null;

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
                        <Button variant="outline" onClick={() => { setConfirmClose(false); doClose(); }}>Discard</Button>
                        <Button onClick={handleSaveAndClose} disabled={saving}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="fixed inset-0 z-150 bg-black/80 flex items-center justify-center">
                <button
                    aria-label="Close"
                    onClick={saving ? undefined : handleClose}
                    className={saving ? "absolute top-3 right-4 text-gray-500" : "absolute top-3 right-4 cursor-pointer text-gray-300 hover:text-white"}
                >
                    <X size={22} />
                </button>
                <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col w-[min(96vw,1500px)] h-[91vh]">
                    {noticeVisible && !isNew && (
                        <div role="note" className="flex items-start gap-3 bg-amber-50 text-amber-900 text-xs px-4 py-2 border-b border-amber-200 shrink-0">
                            <span className="flex-1">{LOSSY_SAVE_NOTICE}</span>
                            <button className="underline shrink-0 cursor-pointer" onClick={() => setNoticeVisible(false)}>Got it</button>
                        </div>
                    )}
                    <div className="flex-1 min-h-0">
                        {loading && (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>
                        )}
                        {!loading && loadError && (
                            <div className="p-4 text-red-500 text-sm">{loadError}</div>
                        )}
                        {!loading && !loadError && (
                            <XlsxEditor
                                key={file?.id ?? name}
                                ref={editorRef}
                                data={data}
                                fileName={name}
                                internalClipboardOnly
                                onSave={handleSave}
                                onDirtyChange={setDirty}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
