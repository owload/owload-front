import { FsObjectType, ProgressInfo } from "@/engine";

export interface DriveStats {
  description?: string;
}

export interface FileProperties {
  id: string;
  type: FsObjectType;
  name: string;
  extension?: string;
  selected?: boolean;
  selectedForCut?: boolean,
  byteOffset?: number;
  byteLength?: number;
  contentHash?: string;
  finished?: boolean;
}

export type UploadQueueItemStatus = "QUEUED" | "PROGRESS" | "FINISHED" | "CANCELLED" | "ERROR";

export interface UploadQueueItem {
  uploadId: string,
  file: File,
  path: string,
  progressInfo: {[key: string]: ProgressInfo}, // key is 'MAIN' for main file, 'PREVIEW_128' for 128px preview, etc.
  status: UploadQueueItemStatus,
  abortController: AbortController,
  previews?: {[key: number]: Blob},
  thumbnailUrl?: string,
  progressThreshold?: boolean; // indicates whether queued group of files ends here. if this group is already uploaded, calc progress accordingly
}

export interface UserInfo {
  id: string;
  name: string;
  privateKey: CryptoKey | undefined
}

export type FsOpsDialogType = "RENAME" | "CREATE_FOLDER" | "REQUEST_PASSWORD" | "REQUEST_DRIVE_DESCRIPTION" | "REQUEST_MV_OPERATION_MODE"

export interface RequestPasswordDialogProps {
  driveName: string
}

export interface RequestDescriptionDialogProps {
  driveName: string
}

export interface RequestMvOperationModeDialogProps {
  commonFileNames: string[]
}

export interface RenameDialogProps {
  pathSrc: string,
  originalName: string
}

export interface VoidDialogProps {

}

export type FsOpsDialogPropsType = RequestPasswordDialogProps | RequestDescriptionDialogProps | RequestMvOperationModeDialogProps | RenameDialogProps | VoidDialogProps;

export interface DialogCallbacks {
  // dialogId is used to identify whether it's the same dialog.
  // usecase: if the user opens a new dialog while the old one is still open, we need to call dialogConcurrentOpenCallback for the old one
  dialogId: string,
  inputCallback: (result: any) => void
  dialogCloseCallback: () => void,
  dialogConcurrentOpenCallback: () => void, // this is called when the user tries to open a dialog while another one is already open
  rejectCallback: (error: Error) => void
}

export type FsDialogProps = (FsOpsDialogPropsType & DialogCallbacks) | undefined;

export interface AbortContext {
  aborted: boolean
};