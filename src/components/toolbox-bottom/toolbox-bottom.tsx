import { FsObjectType, ROOT_NODE_ID } from "@/engine";
import { useCreateFolderDialog, useRenameDialog } from "@/hooks/use-dialogs";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useMediaBreakpoint } from "@/hooks/use-media-breakpoint";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActivateMobileSelectMode, useDeactivateMobileSelectMode, useIsMobileSelectModeOn } from "@/hooks/use-mobile-select-mode";
import { useNavigateDir } from "@/hooks/use-navigate-dir";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useUploadFile } from "@/hooks/use-upload-file";
import { cn } from "@/lib/utils";
import { useFilesStore } from "@/stores/files-store";
import { ArrowLeft, ClipboardPaste, CloudDownload, CloudUpload, Files, FolderPlus, Info, SquareDashedMousePointer, SquarePen, SquareScissors, Trash, Undo, X } from "lucide-react";
import { useEffect, useState } from "react";
import { UploadStateButton } from "./upload-state-button";

function useWindowWidth() {
    const [width, setWidth] = useState(() => window.innerWidth || document.documentElement.clientWidth);
    useEffect(() => {
        const update = () => setWidth(window.innerWidth || document.documentElement.clientWidth);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return width;
}

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
    const breakpoint = useMediaBreakpoint();
    const { pwd, rm, commitMoveOrCopy, selectFilesToCopy, selectFilesToMove, downloadSelectedObject } = useFilesStoreOps();

    const [rmButtonClickPending, setRmButtonClickPending] = useState(false);
    const [pasteButtonClickPending, setPasteButtonClickPending] = useState(false);
    const openRenameDialog = useRenameDialog();
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

    const handlePasteClick = () => {
        setPasteButtonClickPending(true);
        commitMoveOrCopy(pwd()!)
            .finally(() => {
                setPasteButtonClickPending(false);
            });
    };

    let buttonsCount = 1; // back or cancel
    if (isAnyFileSelected) {
        buttonsCount += 3; // copy, cut, delete,
    } else if (!mobileFileSelectModeOn) {
        buttonsCount += 2; // create folder, upload
    }
    if (isPasteAvailable) {
        buttonsCount += 1; // paste
    }
    if (isDownloadAvailable) {
        buttonsCount += 1; // download
    }
    if (isMobile && !mobileFileSelectModeOn) {
        buttonsCount += 1; // mobile select mode
    }
    if (isSingleFileSelected) {
        buttonsCount += 2; // rename and info
    }
    if (showUploadStateButton) {
        buttonsCount++;
    }


    const windowWidth = useWindowWidth();
    const padding = breakpoint === "2xs" || breakpoint === "xs" ? 2 : 4;
    const widthCapacity = windowWidth - padding * 4; // 4 is px size of tailwind '1' spacing unit
    const gap = 1 * 4;
    const pxButtonWidth = Math.max(Math.min(
        Math.floor((widthCapacity - gap * (buttonsCount - 1)) / buttonsCount),
        44), 44);
    const picSize = 20;
    const stdClassname = "p-2.5 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:bg-primary";

    return (
        <div className={cn('flex gap-1 items-end', props.className)}>
            {isAnyFileSelected && <button
                type="button"
                onClick={handleCopyClick}
                onMouseDown={(e) => e.stopPropagation()}
                title="Copy"
                onPointerDown={(e) => e.stopPropagation()}
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <Files size={picSize} />
            </button>}

            {isAnyFileSelected && <button
                type="button"
                onClick={handleCutClick}
                onMouseDown={(e) => e.stopPropagation()}
                title="Cut"
                onPointerDown={(e) => e.stopPropagation()}
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <SquareScissors size={picSize} />
            </button>}

            {isPasteAvailable && <button
                type="button"
                onClick={handlePasteClick}
                onMouseDown={(e) => e.stopPropagation()}
                title="Paste"
                onPointerDown={(e) => e.stopPropagation()}
                disabled={pasteButtonClickPending}
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <ClipboardPaste size={20} />
            </button>}

            {isDownloadAvailable && <button
                type="button"
                onClick={handleDownloadClick}
                onMouseDown={(e) => e.stopPropagation()}
                title="Download"
                onPointerDown={(e) => e.stopPropagation()}
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <CloudDownload size={picSize} />
            </button>}

            {isSingleFileSelected && <button
                type="button"
                onClick={handleRenameClick}
                onMouseDown={(e) => e.stopPropagation()}
                title="Rename"
                onPointerDown={(e) => e.stopPropagation()}
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <SquarePen size={picSize} />
            </button>}

            {isAnyFileSelected && <button
                type="button"
                onClick={handleDeleteClick}
                onMouseDown={(e) => e.stopPropagation()}
                title="Delete"
                disabled={rmButtonClickPending}
                onPointerDown={(e) => e.stopPropagation()}
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <Trash size={picSize} />
            </button>}

            {isSingleFileSelected && <button
                type="button"
                onClick={() => { }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Info"
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <Info size={picSize} />
            </button>}

            {false && <button
                type="button"
                onClick={() => { }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Undo"
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <Undo size={picSize} />
            </button>}

            {!isAnyFileSelected && !mobileFileSelectModeOn && <button
                type="button"
                onClick={handleCreateFolderClick}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Create new folder"
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <FolderPlus size={picSize} />
            </button>}

            {!isAnyFileSelected && !mobileFileSelectModeOn && <button
                type="button"
                onClick={handleUploadClick}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Upload files"
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <CloudUpload size={picSize} />
            </button>}

            {isMobile && !mobileFileSelectModeOn && <button
                type="button"
                onClick={activateMobileSelectMode}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Select files"
                className={stdClassname}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <SquareDashedMousePointer size={picSize} />
            </button>}

            {!mobileFileSelectModeOn && <button
                type="button"
                onClick={handleBackClick}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Back"
                className={stdClassname}
                disabled={isRootDir && !mobileFileSelectModeOn}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <ArrowLeft size={picSize} />
            </button>}

            {mobileFileSelectModeOn && <button
                type="button"
                onClick={handleCancelClick}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Cancel"
                className={stdClassname}
                disabled={isRootDir && !mobileFileSelectModeOn}
                style={{ width: pxButtonWidth, height: pxButtonWidth }}
            >
                <X size={picSize} />
            </button>}
            {showUploadStateButton && <UploadStateButton size={pxButtonWidth} />}
        </div>
    );
};
