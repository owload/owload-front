import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { EditorComponent, EditorHandle } from "@owload/editor-sdk";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFilesStore } from "@/stores/files-store";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { DialogClosedError } from "@/types/errors";
import { registry } from "@/extensions/registry";
import { lossyNote, tooLargeMessage, type LossyFindings } from "./editor-host-messages";

/**
 * Opens a file of the drive in the editor extension that handles its type (owload-docs/decisions/0019).
 * The host owns everything around the editor: this window and its close button, loading, the size
 * check, the unsaved-changes dialog, the upload (always a REPLACE) and the note about what saving
 * could drop. The extension only edits. The editor makes no network request and its copy/paste stays
 * inside it (internalClipboardOnly).
 *
 * A document that is being created (newEditorFile) is not in the drive yet: it is uploaded by the
 * first Save, so closing without saving leaves no empty file behind.
 */

type Phase =
    | { status: "loading" }
    | { status: "ready"; Editor: EditorComponent; data: Uint8Array | null }
    | { status: "error"; message: string };

class EditorErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: Error) {
        // Only the kind of error: the message of an editor may contain pieces of the document.
        console.error("The editor extension crashed:", error.name);
    }
    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="p-6 text-sm text-red-500 space-y-3">
                <p>The editor stopped working. Unsaved changes in it cannot be recovered.</p>
                <Button variant="outline" size="sm" onClick={this.props.onClose}>Close</Button>
            </div>
        );
    }
}

export function EditorHost() {
    const { getFileData, saveFile, pwd, closeSelectedObject } = useFilesStoreOps();
    const setEditorOpen = useFilesStore((state) => state.setEditorOpen);
    const newEditorFile = useFilesStore((state) => state.newEditorFile);
    const setNewEditorFile = useFilesStore((state) => state.setNewEditorFile);
    const selectIds = useFilesStore((state) => state.selectIds);
    const selectedFileObjects = useSelectedFileObjects();

    // What was opened is fixed at mount: after the first save of a new document or a re-sync the
    // selection changes, but the editor must stay.
    const [opened] = useState(() => {
        const file = newEditorFile ? undefined : selectedFileObjects[0];
        const name = newEditorFile?.name ?? file?.name;
        const entry = newEditorFile ? registry.byId(newEditorFile.extensionId) : name ? registry.forFileName(name) : undefined;
        return { file, name, entry };
    });
    const { file, name, entry } = opened;
    const isNew = newEditorFile !== null;

    const [phase, setPhase] = useState<Phase>({ status: "loading" });
    const [findings, setFindings] = useState<LossyFindings>(null);
    const [noteDismissed, setNoteDismissed] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);
    const editorRef = useRef<EditorHandle>(null);

    useEffect(() => {
        if (!entry || !name) return;
        const { extension } = entry;
        const tooLarge = file ? tooLargeMessage(extension, file.byteLength ?? 0) : null;
        if (tooLarge) {
            setPhase({ status: "error", message: tooLarge });
            return;
        }
        let cancelled = false;
        (async () => {
            const hasData = !!file && !!file.byteLength;
            const [module, bytes] = await Promise.all([
                extension.load(),
                hasData ? getFileData(file!) : Promise.resolve(null),
                entry.loadStyles?.(),
            ]);
            if (cancelled) return;
            setPhase({ status: "ready", Editor: module.default, data: bytes });
            if (bytes && extension.inspect) {
                extension.inspect(bytes)
                    .then((result) => { if (!cancelled) setFindings(result.unsupported); })
                    .catch(() => { if (!cancelled) setFindings("unknown"); });
            }
        })().catch((e) => {
            if (!cancelled) setPhase({ status: "error", message: e instanceof Error ? e.message : String(e) });
        });
        return () => { cancelled = true; };
        // The file and the entry are fixed at mount (see `opened`), so one run per opened file is right.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file?.id]);

    // The editor reads `data` once, on mount; the host does not keep a decrypted copy any longer.
    useEffect(() => {
        setPhase((p) => (p.status === "ready" && p.data ? { ...p, data: null } : p));
    }, [phase.status]);

    const handleSave = async (bytes: Uint8Array) => {
        setSaving(true);
        try {
            const upload = new File([new Uint8Array(bytes)], name!);
            const newFileId = await saveFile(upload, pwd()!);
            selectIds([newFileId]);
            setNoteDismissed(true);
        } catch (e) {
            if (e instanceof DialogClosedError) return;
            throw e; // the editor shows it and keeps the document dirty
        } finally {
            setSaving(false);
        }
    };

    const doClose = () => {
        setEditorOpen(false);
        setNewEditorFile(null);
        // A new document that was never saved has nothing selected to go back from.
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
    const note = noteDismissed || isNew ? null : lossyNote(findings);

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
                    {note && (
                        <div role="note" className="flex items-start gap-3 bg-amber-50 text-amber-900 text-xs px-4 py-2 border-b border-amber-200 shrink-0">
                            <span className="flex-1">{note}</span>
                            <button className="underline shrink-0 cursor-pointer" onClick={() => setNoteDismissed(true)}>Got it</button>
                        </div>
                    )}
                    <div className="flex-1 min-h-0">
                        {!entry && <div className="p-4 text-red-500 text-sm">No editor is installed for this file type.</div>}
                        {entry && phase.status === "loading" && (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>
                        )}
                        {entry && phase.status === "error" && (
                            <div className="p-4 text-red-500 text-sm">{phase.message}</div>
                        )}
                        {entry && phase.status === "ready" && (
                            <EditorErrorBoundary onClose={doClose}>
                                <phase.Editor
                                    key={file?.id ?? name}
                                    ref={editorRef}
                                    data={phase.data}
                                    fileName={name}
                                    internalClipboardOnly
                                    onSave={handleSave}
                                    onDirtyChange={setDirty}
                                />
                            </EditorErrorBoundary>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
