import { FsOperationNameConflictMode } from "@/engine";
import { useFilesStore } from "@/stores/files-store";
import { ConcurrentDialogOpen, DialogClosedError } from "@/types/errors";
import { FsOpsDialogPropsType, FsOpsDialogType, RenameDialogProps, RequestDescriptionDialogProps, RequestMvOperationModeDialogProps, RequestPasswordDialogProps, VoidDialogProps } from "@/types/types";
import { useLocation, useNavigate } from "react-router-dom";

export function useRequestPassword(): (dialogProps: RequestPasswordDialogProps) => Promise<string> {
  return useDialog<RequestPasswordDialogProps, string>("REQUEST_PASSWORD");
}

export function useRequestDriveDescription(): (dialogProps: RequestDescriptionDialogProps) => Promise<string> {
  return useDialog<RequestDescriptionDialogProps, string>("REQUEST_DRIVE_DESCRIPTION");
}

export function useRequestMvOperationMode(): (dialogProps: RequestMvOperationModeDialogProps) => Promise<FsOperationNameConflictMode> {
  return useDialog<RequestMvOperationModeDialogProps, FsOperationNameConflictMode>("REQUEST_MV_OPERATION_MODE");
}

export function useRenameDialog(): (dialogProps: RenameDialogProps) => Promise<void> {
  return useDialog<RenameDialogProps, void>("RENAME");
}

export function useCreateFolderDialog() {
  return useDialog<VoidDialogProps, void>("CREATE_FOLDER");
}

function useDialog<T extends FsOpsDialogPropsType, R>(dialogType: FsOpsDialogType): (dialogProps: T) => Promise<R> {
  const setFsOpsDialogType = useFilesStore((state) => state.setFsOpsDialogType);
  const openFsOpsDialog = useFsOpenDialogModal();
  const setFsDialogProps = useFilesStore((state) => state.setFsDialogProps);
  return async function (dialogProps: T) {
    return new Promise((resolve, reject) => {
      setFsOpsDialogType(dialogType);
      setFsDialogProps({
        ...dialogProps,
        dialogId: crypto.randomUUID(),
        inputCallback: (result: R) => {
          resolve(result);
        },
        dialogCloseCallback: () => {
          reject(new DialogClosedError());
        },
        dialogConcurrentOpenCallback: () => {
          reject(new ConcurrentDialogOpen());
        },
        rejectCallback: (error: Error) => {
          reject(error);
        }
      });
      openFsOpsDialog();
    });
  }
}

export function useFsOpenDialogModal() {
  const navigate = useNavigate();
  const isFsDialogModalOpen = useIsFsDialogModalOpen();
  return async () => { if (!isFsDialogModalOpen) await navigate("#modal", { replace: false }); }
}

export function useFsCloseDialogModal() {
  const navigate = useNavigate();
  return async () => { await navigate(-1); }
}

export function useIsFsDialogModalOpen() {
  const location = useLocation();
  return location.hash === "#modal"
}