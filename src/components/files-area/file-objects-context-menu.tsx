import { PropsWithChildren, useState } from "react";
import { FileActionsSheet } from "./file-actions-sheet";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuShortcut, ContextMenuTrigger } from "../ui/context-menu";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useRenameDialog, useOpenFileProperties } from "@/hooks/use-dialogs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActivateMobileSelectMode, useIsMobileSelectModeOn } from "@/hooks/use-mobile-select-mode";
import ContextMenuHandler from "./selectable-area/context-menu-handler";
import { FileProperties } from "@/types/types";
import { useFilesStore } from "@/stores/files-store";
import { FsObjectType } from "@/engine";
import { isTauri } from "@/lib/utils";
import { useCanWrite } from "@/hooks/use-drive-role";
import { ExternalLink, Files, FolderOpen, Info, SquarePen, SquareScissors, Trash, CloudDownload } from "lucide-react";



export function FileObjectsContextMenu({ children, fileObject }: PropsWithChildren<{ fileObject: FileProperties }>) {
    const canWrite = useCanWrite();
    const selectedFileObjects = useSelectedFileObjects();
    const openRenameDialog = useRenameDialog();
    const { pwd, rm, downloadSelectedObject, openSelectedObject, openSelectedObjectInNewTab, isSelectedObjectOpenAvailable, isSelectedObjectDownloadAvailable, selectFilesToCopy, selectFilesToMove } = useFilesStoreOps();
    const openFileProperties = useOpenFileProperties();
    const isMobile = useIsMobile();
    const mobileFileSelectModeOn = useIsMobileSelectModeOn();
    const activateMobileSelectMode = useActivateMobileSelectMode();
    const selectIds = useFilesStore((state) => state.selectIds);

    function handleCopyClick(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        selectFilesToCopy(pwd()!, selectedFileObjects.map((f) => f.name));
    }

    function handleCutClick(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        selectFilesToMove(pwd()!, selectedFileObjects.map((f) => f.name));
    }

    function handleDeleteClick(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        rm(selectedFileObjects.map((f) => f.name));
    }

    function handleDownloadClick(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        downloadSelectedObject();
    }

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    function handleRenameClick(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        openRenameDialog({ pathSrc: pwd()!, originalName: selectedFileObjects[0].name });
    }

    function handlePropertiesClick(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
        const file = selectedFileObjects[0];
        const dir = pwd()!;
        const filePath = (dir + '/' + file.name).replace('//', '/');
        openFileProperties({ filePath, nodeId: file.id, byteLength: file.byteLength ?? 0 }).catch(() => {});
    }

    const [sheetOpen, setSheetOpen] = useState(false);
    // on a phone the actions open as a bottom sheet over the selected item
    const contextMenuHandler = new ContextMenuHandler(() => {
        selectIds([fileObject.id]);
        if (isMobile) setSheetOpen(true);
    });

    if (isMobile) {
        return (
            <div className="inline-block"
                onTouchStart={contextMenuHandler.onTouchStart}
                onTouchMove={contextMenuHandler.onTouchMove}
                onTouchCancel={contextMenuHandler.onTouchCancel}
                onTouchEnd={contextMenuHandler.onTouchEnd}
                onContextMenu={contextMenuHandler.onContextMenu}
            >
                {children}
                {sheetOpen && <FileActionsSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    files={selectedFileObjects}
                    canOpen={isSelectedObjectOpenAvailable()}
                    canDownload={isSelectedObjectDownloadAvailable()}
                    onOpen={openSelectedObject}
                    onOpenInNewTab={openSelectedObjectInNewTab}
                    onDownload={downloadSelectedObject}
                    canWrite={canWrite}
                    onRename={() => openRenameDialog({ pathSrc: pwd()!, originalName: selectedFileObjects[0].name })}
                    onCopy={() => selectFilesToCopy(pwd()!, selectedFileObjects.map((f) => f.name))}
                    onCut={() => selectFilesToMove(pwd()!, selectedFileObjects.map((f) => f.name))}
                    onDelete={() => rm(selectedFileObjects.map((f) => f.name))}
                    onProperties={() => handlePropertiesClick({ stopPropagation() {} } as React.PointerEvent<HTMLDivElement>)}
                />}
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger className="relative select-none h-full">
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent onPointerDown={handlePointerDown} className="w-64">
                {isMobile && <ContextMenuItem disabled={mobileFileSelectModeOn} onClick={() => activateMobileSelectMode()}>
                    Select
                    <ContextMenuShortcut>⌘O</ContextMenuShortcut>
                </ContextMenuItem>}
                {isSelectedObjectOpenAvailable() && <ContextMenuItem onClick={openSelectedObject}>
                    <FolderOpen />Open
                    <ContextMenuShortcut>⌘O</ContextMenuShortcut>
                </ContextMenuItem>}
                {isSelectedObjectOpenAvailable() && selectedFileObjects[0]?.type !== FsObjectType.DIR && <ContextMenuItem onClick={openSelectedObjectInNewTab}>
                    <ExternalLink />{isTauri() ? 'Open in new window' : 'Open in new tab'}
                </ContextMenuItem>}
                {isSelectedObjectDownloadAvailable() && <ContextMenuItem onClick={handleDownloadClick}>
                    <CloudDownload />Download
                    <ContextMenuShortcut>⌘D</ContextMenuShortcut>
                </ContextMenuItem>}
                {canWrite && selectedFileObjects.length === 1 && <ContextMenuItem onClick={handleRenameClick}>
                    <SquarePen />Rename
                    <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                </ContextMenuItem>}
                {canWrite && <ContextMenuItem onClick={handleCopyClick}>
                    <Files />Copy
                    <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                </ContextMenuItem>}
                {canWrite && <ContextMenuItem onClick={handleCutClick}>
                    <SquareScissors />Cut
                    <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                </ContextMenuItem>}
                {canWrite && <ContextMenuItem variant="destructive" onClick={handleDeleteClick}><Trash />Delete</ContextMenuItem>}
                {selectedFileObjects.length === 1 && selectedFileObjects[0].type !== FsObjectType.DIR && (
                    <ContextMenuItem onClick={handlePropertiesClick}><Info />Properties</ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}