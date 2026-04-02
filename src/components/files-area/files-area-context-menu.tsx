import { PropsWithChildren } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuShortcut, ContextMenuTrigger } from "../ui/context-menu";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { useCreateFolderDialog } from "@/hooks/use-dialogs";
import { useActivateMobileSelectMode, useDeactivateMobileSelectMode } from "@/hooks/use-mobile-select-mode";
import { useUploadFile } from "@/hooks/use-upload-file";
import { useIsMobile } from "@/hooks/use-mobile";
import ContextMenuHandler from "./selectable-area/context-menu-handler";

export function FilesAreaContextMenu({ children }: PropsWithChildren) {
    const isMobile = useIsMobile();
    const openCreateFolderDialog = useCreateFolderDialog();
    const { pwd, commitMoveOrCopy } = useFilesStoreOps();
    const filesToMoveOrCopy = useFilesStore((state) => state.filesToMoveOrCopy);
    const uploadFile = useUploadFile();
    const activateMobileSelectMode = useActivateMobileSelectMode();
    const deactivateMobileSelectMode = useDeactivateMobileSelectMode();

    const handleUploadClick = () => {
        deactivateMobileSelectMode();
        uploadFile();
    };

    const contextMenuHandler = new ContextMenuHandler((e) => {
        e.stopPropagation();
        e.preventDefault();
        activateMobileSelectMode();
    });

    if(isMobile) {
        return (
            <div
                onContextMenu={contextMenuHandler.onContextMenu}
                onTouchStart={contextMenuHandler.onTouchStart}
                onTouchCancel={contextMenuHandler.onTouchCancel}
                onTouchEnd={contextMenuHandler.onTouchEnd}
                onTouchMove={contextMenuHandler.onTouchMove}
            >
                {children}
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger className="select-none">
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem inset onClick={openCreateFolderDialog}>
                    Create folder
                    <ContextMenuShortcut>⌘N</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem inset onClick={handleUploadClick}>
                    Upload file
                    <ContextMenuShortcut>⌘U</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                    inset disabled={!filesToMoveOrCopy?.fileNames?.length}
                    onClick={()=>commitMoveOrCopy(pwd()!)}
                >Paste</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}