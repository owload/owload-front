import type { DriveId } from './drive-backend';

export type SessionId = string;

export enum SessionStatus {
  ACTIVE,
  FINISHED,
  STALE
}

export interface SessionInfo {
  sessionId: SessionId,
  byteOffset: number,
  byteLength: number,
  driveId: DriveId,
  createdTimestamp: number,
  lastWriteTimestamp: number,
  status: SessionStatus
};

export abstract class FilesystemBackend {
  public abstract getOperations(driveId: DriveId, startBytePos?: number): Promise<Uint8Array>;
  public abstract saveOperation(driveId: DriveId, fsOperationData: Uint8Array): Promise<void>;
  public abstract startUploadSession(driveId: DriveId, byteLength: number): Promise<SessionInfo>;
  public abstract finishUploadSession(sessionId: SessionId): Promise<void>;
  public abstract saveDataBlock(sessionId: SessionId, bytes: Uint8Array, blockByteOffset: number, signal?: AbortSignal): Promise<void>;
  public abstract getDataBlock(driveId: DriveId, byteOffset: number, byteLength: number, cache?: boolean): Promise<Uint8Array>;
}
