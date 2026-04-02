import { PropsWithChildren } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuShortcut, ContextMenuTrigger } from "../ui/context-menu";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useRenameDialog } from "@/hooks/use-dialogs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActivateMobileSelectMode, useIsMobileSelectModeOn } from "@/hooks/use-mobile-select-mode";
import ContextMenuHandler from "./selectable-area/context-menu-handler";
import { FileProperties } from "@/types/types";
import { useFilesStore } from "@/stores/files-store";



export function FileObjectsContextMenu({ children, fileObject }: PropsWithChildren<{ fileObject: FileProperties }>) {
    const selectedFileObjects = useSelectedFileObjects();
    const openRenameDialog = useRenameDialog();
    const { pwd, rm, downloadSelectedObject, openSelectedObject, isSelectedObjectOpenAvailable, isSelectedObjectDownloadAvailable, selectFilesToCopy, selectFilesToMove } = useFilesStoreOps();
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

    const contextMenuHandler = new ContextMenuHandler(() => {
        selectIds([fileObject.id]);
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
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger className="relative select-none h-full">
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent onPointerDown={handlePointerDown} className="w-64">
                {isMobile && <ContextMenuItem disabled={mobileFileSelectModeOn} inset onClick={() => activateMobileSelectMode()}>
                    Select
                    <ContextMenuShortcut>⌘O</ContextMenuShortcut>
                </ContextMenuItem>}
                {isSelectedObjectOpenAvailable() && <ContextMenuItem inset onClick={openSelectedObject}>
                    Open
                    <ContextMenuShortcut>⌘O</ContextMenuShortcut>
                </ContextMenuItem>}
                {isSelectedObjectDownloadAvailable() && <ContextMenuItem inset onClick={handleDownloadClick}>
                    Download
                    <ContextMenuShortcut>⌘D</ContextMenuShortcut>
                </ContextMenuItem>}
                {selectedFileObjects.length === 1 && <ContextMenuItem inset onClick={handleRenameClick}>
                    Rename
                    <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                </ContextMenuItem>}
                <ContextMenuItem inset onClick={handleCopyClick}>
                    Copy
                    <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem inset onClick={handleCutClick}>
                    Cut
                    <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem inset onClick={handleDeleteClick}>Delete</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}