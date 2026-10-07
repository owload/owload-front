import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { TriangleAlert, X } from "lucide-react";
import type { EditorComponent, EditorExtension, EditorHandle } from "@owload/editor-sdk";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DialogHead } from "@/components/fs-dialogs/dialog-parts";
import { useFilesStore } from "@/stores/files-store";
import { PREVIEW_SIZES, getPreviewFileName, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { DialogClosedError } from "@/types/errors";
import { registry } from "@/extensions/registry";
import { needsPreviewBackfill, requestPreview } from "@/extensions/preview";
import { tooLargeMessage } from "./editor-host-messages";

/**
 * Opens a file of the drive in the editor extension that handles its type (owload-docs/decisions/0019).
 * The host owns everything around the editor: this window, loading, the size check, the unsaved-changes
 * dialog and the upload (always a REPLACE). The extension edits and draws its own title bar, including
 * the close control, which calls onClose (decisions/0021); the host decides whether the window may close.
 * Anything an editor knows about its own format, such as what saving would drop, it tells the user itself
 * (decisions/0022). The editor makes no network request and its copy/paste stays inside it
 * (internalClipboardOnly).
 *
 * A document that is being created (newEditorFile) is not in the drive yet: it is uploaded by the
 * first Save, so closing without saving leaves no empty file behind.
 */

const backfillingIds = new Set<string>();

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
            <div className="space-y-3 p-6 text-sm text-[#b3261e]">
                <p>The editor stopped working. Unsaved changes in it cannot be recovered.</p>
                <Button variant="outline" className="h-11 rounded-[10px] px-4" onClick={this.props.onClose}>Close</Button>
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

    const [phase, setPhase] = useState<Phase>({ status: "loading" });
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);
    const editorRef = useRef<EditorHandle>(null);
    // The id of the document as it is now: a save gives it a new one.
    const currentIdRef = useRef(file?.id);

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
            // A document that lacks its thumbnail (uploaded before previews existed, or the preview failed
            // then) gets it now, from the bytes that are already decrypted (decisions/0023).
            if (file && needsPreviewBackfill(extension, file, useFilesStore.getState().fileObjects, getPreviewFileName(file.id, PREVIEW_SIZES.THUMBNAIL))) {
                void backfillPreview(extension, file.id, bytes ?? new Uint8Array(0)); // an empty file has no bytes to read
            }
            if (cancelled) return;
            setPhase({ status: "ready", Editor: module.default, data: bytes });
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

    // Files whose thumbnail is being made right now, so opening a document twice does not make two.
    const backfilling = backfillingIds;
    const backfillPreview = async (extension: EditorExtension, fileId: string, bytes: Uint8Array) => {
        if (backfilling.has(fileId)) return;
        backfilling.add(fileId);
        try {
            await uploadPreview(extension, fileId, bytes, pwd()!);
        } finally {
            backfilling.delete(fileId);
        }
    };

    const uploadPreview = async (extension: EditorExtension, fileId: string, bytes: Uint8Array, path: string) => {
        try {
            const png = await requestPreview(extension, bytes);
            if (!png) return;
            const name = getPreviewFileName(fileId, PREVIEW_SIZES.THUMBNAIL);
            await saveFile(new File([new Uint8Array(png)], name, { type: "image/png" }), path);
            // Uploading refreshes the file list, which drops the selection; closing the editor goes back from
            // the selected file, so while the editor is still open the document is selected again.
            if (useFilesStore.getState().editorOpen && currentIdRef.current) selectIds([currentIdRef.current]);
        } catch {
            // No thumbnail is not an error worth showing: the document itself is saved.
        }
    };

    const handleSave = async (bytes: Uint8Array) => {
        setSaving(true);
        try {
            const upload = new File([new Uint8Array(bytes)], name!);
            const path = pwd()!;
            const newFileId = await saveFile(upload, path);
            selectIds([newFileId]);
            currentIdRef.current = newFileId;
            // The new version has a new id, so it needs its own thumbnail. Best effort, in the background.
            void uploadPreview(entry!.extension, newFileId, bytes, path);
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

    return (
        <>
            <Dialog open={confirmClose} onOpenChange={(open) => !open && setConfirmClose(false)}>
                <DialogContent className="z-[200]">
                    <div className="flex flex-col gap-4">
                        <DialogHead icon={TriangleAlert} tone="warning" title="Unsaved changes" subtitle="Save before closing?" />
                        <DialogFooter className="flex-row flex-wrap justify-end gap-2">
                            <Button variant="ghost" className="h-11 rounded-[10px] px-4" onClick={() => setConfirmClose(false)}>Cancel</Button>
                            <Button variant="outline" className="h-11 rounded-[10px] px-4" onClick={() => { setConfirmClose(false); doClose(); }}>Discard</Button>
                            <Button className="h-11 rounded-[10px] px-5" onClick={handleSaveAndClose} disabled={saving}>Save</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
            <div className="fixed inset-0 z-150 bg-white flex flex-col">
                {phase.status !== "ready" && (
                    // No editor is on screen yet (or at all), so there is no title bar of its own to close from.
                    <div className="flex justify-end p-2 shrink-0">
                        <button aria-label="Close" onClick={doClose} className="cursor-pointer text-muted-foreground hover:text-foreground">
                            <X size={22} />
                        </button>
                    </div>
                )}
                <div className="flex-1 min-h-0">
                    {!entry && <div className="p-4 text-sm text-[#b3261e]">No editor is installed for this file type.</div>}
                    {entry && phase.status === "loading" && (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>
                    )}
                    {entry && phase.status === "error" && (
                        <div className="p-4 text-sm text-[#b3261e]">{phase.message}</div>
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
                                onClose={handleClose}
                            />
                        </EditorErrorBoundary>
                    )}
                </div>
            </div>
        </>
    );
}
