import { FsObjectType, ROOT_NODE_ID } from "@/engine";
import { useCreateFolderDialog, useOpenFileProperties, useRenameDialog } from "@/hooks/use-dialogs";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActivateMobileSelectMode, useDeactivateMobileSelectMode, useIsMobileSelectModeOn } from "@/hooks/use-mobile-select-mode";
import { useNavigateDir } from "@/hooks/use-navigate-dir";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useUploadFile } from "@/hooks/use-upload-file";
import { cn } from "@/lib/utils";
import { useFilesStore } from "@/stores/files-store";
import { ArrowLeft, ChevronDown, ChevronUp, ClipboardPaste, CloudDownload, CloudUpload, Files, FolderPlus, Info, SquareDashedMousePointer, SquarePen, SquareScissors, Trash, X } from "lucide-react";
import { useState } from "react";
import { TransfersTray } from "../transfers/transfers-tray";
import { useTotalTransferProgress } from "@/hooks/use-upload-progress";

export function ToolboxBottom(props: { className?: string }) {
    const openCreateFolderDialog = useCreateFolderDialog();
    const uploadFile = useUploadFile();
    const navigateDir = useNavigateDir();
    const deselectAll = useFilesStore((state) => state.deselectAll);
    const deactivateMobileSelectMode = useDeactivateMobileSelectMode();
    const { pwdWithId } = useFilesStoreOps();
    const mobileFileSelectModeOn = useIsMobileSelectModeOn();
    const activateMobileSelectMode = useActivateMobileSelectMode();
    const isMobile = useIsMobile();
    const { pwd, rm, commitMoveOrCopy, selectFilesToCopy, selectFilesToMove, downloadSelectedObject } = useFilesStoreOps();

    // On a phone the dock starts folded into the "Actions" pill; the user unfolds it.
    const [expanded, setExpanded] = useState(false);
    const collapsed = !expanded;
    const transferPercent = useTotalTransferProgress()();
    const [rmButtonClickPending, setRmButtonClickPending] = useState(false);
    const [pasteButtonClickPending, setPasteButtonClickPending] = useState(false);
    const openRenameDialog = useRenameDialog();
    const openFileProperties = useOpenFileProperties();
    const uploadQueue = useFilesStore((state) => state.uploadQueue);

    const pathItems = pwdWithId();
    const isRootDir = pathItems.length === 0;

    const selectedFileObjects = useSelectedFileObjects();
    const filesToMoveOrCopy = useFilesStore((state) => state.filesToMoveOrCopy);
    const isAnyFileSelected = selectedFileObjects.length > 0;
    const isSingleFileSelected = selectedFileObjects.length === 1;
    const isDownloadAvailable = isSingleFileSelected && selectedFileObjects[0].type !== FsObjectType.DIR;
    const isPasteAvailable = !mobileFileSelectModeOn && filesToMoveOrCopy?.fileNames?.length;
    const showUploadStateButton = uploadQueue.length > 0;

    const handleBackClick = () => {
        console.log('[toolbar] back clicked');
        // pathItems.length is >= 1 because otherwise the button is disabled
        if (pathItems.length === 1) {
            navigateDir(ROOT_NODE_ID);
            return;
        }
        navigateDir(pathItems[pathItems.length - 2].dirId);
    };

    const handleCancelClick = () => {
        deselectAll();
        deactivateMobileSelectMode();
        navigateDir(pathItems[pathItems.length - 2].dirId);
    }


    const handleUploadClick = () => {
        deactivateMobileSelectMode();
        uploadFile();
    };

    const handleCreateFolderClick = () => {
        console.log('[toolbar] create folder clicked');
        deactivateMobileSelectMode();
        openCreateFolderDialog({});
    };

    const handleDeleteClick = () => {
        if (selectedFileObjects.length === 0) {
            return;
        }
        setRmButtonClickPending(true);
        rm(selectedFileObjects.map((f) => f.name)).finally(() => {
            setRmButtonClickPending(false);
        });
    };

    const handleCopyClick = () => {
        if (selectedFileObjects.length === 0) {
            return;
        }
        selectFilesToCopy(pwd()!, selectedFileObjects.map((f) => f.name));
    };

    const handleCutClick = () => {
        if (selectedFileObjects.length === 0) {
            return;
        }
        selectFilesToMove(pwd()!, selectedFileObjects.map((f) => f.name));
    };

    const handleDownloadClick = () => {
        if (selectedFileObjects.length === 0) {
            return;
        }
        downloadSelectedObject();
    };

    const handleRenameClick = () => {
        if (selectedFileObjects.length === 0) {
            return;
        }
        openRenameDialog({ pathSrc: pwd()!, originalName: selectedFileObjects[0].name });
    };

    const handlePropertiesClick = () => {
        if (selectedFileObjects.length !== 1 || selectedFileObjects[0].type === FsObjectType.DIR) return;
        const file = selectedFileObjects[0];
        const dir = pwd() ?? '/';
        const filePath = (dir + '/' + file.name).replace('//', '/');
        openFileProperties({ filePath, nodeId: file.id, byteLength: file.byteLength ?? 0 }).catch(() => {});
    };

    const handlePasteClick = () => {
        setPasteButtonClickPending(true);
        commitMoveOrCopy(pwd()!)
            .finally(() => {
                setPasteButtonClickPending(false);
            });
    };

    const dockButton = {
        // a click on the dock must not start or end a selection of the files behind it
        onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
        onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    };
    const picSize = 18;
    const hasSelectionActions = isDownloadAvailable || isAnyFileSelected;

    const buttons = (
        <>
            {!mobileFileSelectModeOn && <>
                <DockButton label="Copy" stacked={isMobile} disabled={!isAnyFileSelected} onClick={handleCopyClick} {...dockButton}><Files size={picSize} /></DockButton>
                <DockButton label="Cut" stacked={isMobile} disabled={!isAnyFileSelected} onClick={handleCutClick} {...dockButton}><SquareScissors size={picSize} /></DockButton>
                <DockButton label="Paste" stacked={isMobile} disabled={!isPasteAvailable || pasteButtonClickPending} onClick={handlePasteClick} {...dockButton}><ClipboardPaste size={picSize} /></DockButton>
            </>}
            {mobileFileSelectModeOn && isAnyFileSelected && <>
                <DockButton label="Copy" stacked={isMobile} onClick={handleCopyClick} {...dockButton}><Files size={picSize} /></DockButton>
                <DockButton label="Cut" stacked={isMobile} onClick={handleCutClick} {...dockButton}><SquareScissors size={picSize} /></DockButton>
            </>}

            {hasSelectionActions && !isMobile && <DockDivider />}
            {isDownloadAvailable && <DockButton iconOnly={!isMobile} stacked={isMobile} label="Download" onClick={handleDownloadClick} {...dockButton}><CloudDownload size={picSize} /></DockButton>}
            {isSingleFileSelected && <DockButton iconOnly={!isMobile} stacked={isMobile} label="Rename" onClick={handleRenameClick} {...dockButton}><SquarePen size={picSize} /></DockButton>}
            {isAnyFileSelected && <DockButton iconOnly={!isMobile} stacked={isMobile} label="Delete" disabled={rmButtonClickPending} onClick={handleDeleteClick} {...dockButton}><Trash size={picSize} /></DockButton>}
            {isSingleFileSelected && selectedFileObjects[0]?.type !== FsObjectType.DIR && <DockButton iconOnly={!isMobile} stacked={isMobile} label="Properties" onClick={handlePropertiesClick} {...dockButton}><Info size={picSize} /></DockButton>}

            {!mobileFileSelectModeOn && <>
                {!isMobile && <DockDivider />}
                <DockButton label={isMobile ? "Folder" : "Create folder"} stacked={isMobile} onClick={handleCreateFolderClick} {...dockButton}><FolderPlus size={picSize} /></DockButton>
                <DockButton label="Upload" stacked={isMobile} onClick={handleUploadClick} {...dockButton}><CloudUpload size={picSize} /></DockButton>
            </>}
            {isMobile && !mobileFileSelectModeOn && <DockButton label="Select" stacked onClick={activateMobileSelectMode} {...dockButton}><SquareDashedMousePointer size={picSize} /></DockButton>}
            {isMobile && !mobileFileSelectModeOn && <DockButton label="Back" stacked disabled={isRootDir} onClick={handleBackClick} {...dockButton}><ArrowLeft size={picSize} /></DockButton>}
            {mobileFileSelectModeOn && <DockButton label="Cancel" stacked={isMobile} onClick={handleCancelClick} {...dockButton}><X size={picSize} /></DockButton>}
        </>
    );

    // On a phone the dock is a sheet at the bottom edge, which folds into a small "Actions" pill.
    if (isMobile && collapsed) {
        return (
            <div className={cn('pointer-events-none flex justify-center', props.className)}>
                <button
                    type="button"
                    aria-label="Show actions"
                    aria-expanded="false"
                    onClick={() => setExpanded(true)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="pointer-events-auto flex h-12 cursor-pointer items-center gap-2.5 rounded-full bg-sunny-ink pl-4 pr-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.26)] outline-sunny-yellow focus-visible:outline-2"
                >
                    {showUploadStateButton && <><span className="text-sunny-yellow">{transferPercent}%</span><span aria-hidden="true" className="h-5 w-px bg-sunny-ink-track" /></>}
                    <span>Actions</span>
                    <ChevronUp className="size-4 text-sunny-yellow" strokeWidth={2.4} aria-hidden="true" />
                </button>
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className={cn('pointer-events-none', props.className, 'bottom-0 px-0')}>
                <div role="toolbar" aria-label="File actions" className="pointer-events-auto relative flex flex-col gap-0.5 rounded-t-[20px] bg-sidebar px-2 pb-3 pt-1 text-white shadow-[0_-10px_30px_rgba(0,0,0,0.22)]">
                    <div className="flex min-h-11 items-center gap-1 pl-1.5">
                        <div className="flex min-w-0 flex-1 items-center justify-center">
                            {showUploadStateButton
                                ? <div className="flex w-full items-center"><TransfersTray /></div>
                                : <span aria-hidden="true" className="h-1 w-10 rounded-full bg-sunny-ink-track" />}
                        </div>
                        <button
                            type="button"
                            aria-label="Hide actions"
                            aria-expanded="true"
                            onClick={() => setExpanded(false)}
                            {...dockButton}
                            className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-[10px] text-white outline-sunny-yellow hover:bg-white/10 focus-visible:outline-2"
                        >
                            <ChevronDown className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
                        </button>
                    </div>
                    <div className="flex gap-0.5 overflow-x-auto">{buttons}</div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('pointer-events-none flex justify-center px-4', props.className)}>
            <div role="toolbar" aria-label="File actions" className="pointer-events-auto relative flex flex-wrap items-center justify-center gap-1 rounded-[18px] bg-sidebar p-2 text-white shadow-[0_12px_30px_rgba(42,40,34,0.30)]">
                {buttons}
                {showUploadStateButton && <>
                    <DockDivider />
                    <TransfersTray />
                </>}
            </div>
        </div>
    );
};

/** One button of the dock: an icon and its label; the label gives way to the icon alone on a narrow screen, or when asked to (the actions on a selection, to keep the dock short). */
function DockButton({ label, iconOnly, stacked, children, disabled, onClick, onMouseDown, onPointerDown }: {
    label: string;
    iconOnly?: boolean;
    stacked?: boolean;
    children: React.ReactNode;
    disabled?: boolean;
    onClick: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onPointerDown={onPointerDown}
            className={cn(
                "flex cursor-pointer items-center text-white outline-sunny-yellow hover:bg-white/10 focus-visible:outline-2 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent [&>svg]:text-sunny-yellow",
                stacked
                    ? "h-14 min-w-0 flex-1 flex-col justify-center gap-1 rounded-[10px] px-1 text-[11px] font-medium"
                    : "h-11 gap-2 rounded-xl px-3 text-sm font-semibold max-sm:px-2.5"
            )}
        >
            {children}
            <span className={stacked ? undefined : iconOnly ? "sr-only" : "max-sm:hidden"}>{label}</span>
        </button>
    );
}

function DockDivider() {
    return <span aria-hidden="true" className="mx-1 h-6 w-px bg-sunny-ink-track" />;
}
