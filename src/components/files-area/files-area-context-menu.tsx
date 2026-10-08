import { PropsWithChildren } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuShortcut, ContextMenuTrigger } from "../ui/context-menu";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { useCreateEditorFileDialog, useCreateFolderDialog } from "@/hooks/use-dialogs";
import { useActivateMobileSelectMode, useDeactivateMobileSelectMode } from "@/hooks/use-mobile-select-mode";
import { useUploadFile } from "@/hooks/use-upload-file";
import { useIsMobile } from "@/hooks/use-mobile";
import ContextMenuHandler from "./selectable-area/context-menu-handler";
import { registry } from "@/extensions/registry";
import { ClipboardPaste, CloudUpload, FilePlus, FolderPlus } from "lucide-react";
import { useCanWrite } from "@/hooks/use-drive-role";

export function FilesAreaContextMenu({ children }: PropsWithChildren) {
    const isMobile = useIsMobile();
    const canWrite = useCanWrite();
    const openCreateFolderDialog = useCreateFolderDialog();
    const openCreateEditorFileDialog = useCreateEditorFileDialog();
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

    // A reader only views the drive: nothing to create, upload or paste.
    if (!canWrite) {
        return <div className="select-none">{children}</div>;
    }

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
                <ContextMenuItem onClick={openCreateFolderDialog}>
                    <FolderPlus />Create folder
                    <ContextMenuShortcut>⌘N</ContextMenuShortcut>
                </ContextMenuItem>
                {registry.creatable().map(({ extension }) => (
                    <ContextMenuItem key={extension.id} onClick={() => openCreateEditorFileDialog({ extensionId: extension.id })}>
                        <FilePlus />New {extension.createNew!.label}
                    </ContextMenuItem>
                ))}
                <ContextMenuItem onClick={handleUploadClick}>
                    <CloudUpload />Upload file
                    <ContextMenuShortcut>⌘U</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                    disabled={!filesToMoveOrCopy?.fileNames?.length}
                    onClick={()=>commitMoveOrCopy(pwd()!)}
                ><ClipboardPaste />Paste</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}