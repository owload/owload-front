import { useEffect } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { CreateDirDialog } from "./create-dir-dialog";
import { useFilesStore } from "@/stores/files-store";
import { RequestPasswordDialog } from "./request-password-dialog";
import { DialogCallbacks, RenameDialogProps, RequestDescriptionDialogProps, RequestMvOperationModeDialogProps, RequestPasswordDialogProps } from "@/types/types";
import { RequestDriveDescriptionDialog } from "./request-drive-description-dialog";
import { RequestMvOperationMode } from "./request-mv-operation-mode";
import { RenameDialog } from "./rename-dialog";
import { useFsCloseDialogModal, useIsFsDialogModalOpen } from "@/hooks/use-dialogs";


export function FsOpsDialog() {
    const fsOpsDialogOpen = useIsFsDialogModalOpen();
    const closeDialog = useFsCloseDialogModal();
    const fsOpsDialogType = useFilesStore((state) => state.fsOpsDialogType);
    const fsDialogProps = useFilesStore((state) => state.fsDialogProps);

    let handleClose = () => {
        closeDialog();
    }

    useEffect(() => {
        return () => {
            fsDialogProps?.dialogConcurrentOpenCallback();
        }
    }, [fsDialogProps?.dialogId]);


    useEffect(() => {
        if (!fsOpsDialogOpen) {
            if (fsOpsDialogType === "REQUEST_PASSWORD" || fsOpsDialogType === "REQUEST_DRIVE_DESCRIPTION" || fsOpsDialogType === "REQUEST_MV_OPERATION_MODE") {
                const { dialogCloseCallback } = fsDialogProps as DialogCallbacks;
                if (dialogCloseCallback) {
                    dialogCloseCallback();
                }
            }
        }
    }, [fsOpsDialogOpen]);

    return (<Dialog open={fsOpsDialogOpen} onOpenChange={handleClose}>
        <DialogContent>
            {fsOpsDialogType === "CREATE_FOLDER" && (<CreateDirDialog />)}
            {fsOpsDialogType === "RENAME" && (<RenameDialog {...(fsDialogProps as RenameDialogProps)} />)}
            {fsOpsDialogType === "REQUEST_PASSWORD" && (<RequestPasswordDialog {...(fsDialogProps as RequestPasswordDialogProps & DialogCallbacks)} />)}
            {fsOpsDialogType === "REQUEST_DRIVE_DESCRIPTION" && (<RequestDriveDescriptionDialog {...(fsDialogProps as RequestDescriptionDialogProps & DialogCallbacks)} />)}
            {fsOpsDialogType === "REQUEST_MV_OPERATION_MODE" && (<RequestMvOperationMode {...(fsDialogProps as RequestMvOperationModeDialogProps & DialogCallbacks)} />)}
        </DialogContent>
    </Dialog>
    );
}
