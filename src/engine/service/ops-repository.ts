import { FsOperation } from "./fs-operation";

export enum RejectionReason {
  DESERIALIZATION_ERROR = "DESERIALIZATION_ERROR",
  INVALID_PREV_OPERATION_HASH = "INVALID_PREV_OPERATION_HASH",
  INVALID_USER_SIGNATURE = "INVALID_USER_SIGNATURE",
  INVALID_TIMESTAMP = "INVALID_TIMESTAMP",
  FS_NAME_ALREADY_USED = "FS_NAME_ALREADY_USED",
  FS_OTHER_ERROR = "FS_OTHER_ERROR"
}

export interface FsOperationWrapper {
  opStr: string;
  startBytePos: number;
  byteLength: number;
  op?: FsOperation;
  valid: boolean;
  rejectionReason?: RejectionReason;
}

export interface OpsRepository {
  getOperations: (startBytePos?: number, lastOperationHash?: string) => Promise<FsOperationWrapper[]>;
  saveOperation: (fsOperation: FsOperation) => Promise<void>;
}
