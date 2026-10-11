import type { DriveActionLogEntry } from "@/engine/service/drive-action-log";
import type { DriveId } from "@/engine/backend/drive-backend";
import type { FilesystemBackend, SessionId, SessionInfo } from "@/engine/backend/filesystem-backend";
import { BlockStore } from "./block-store";
import { VideoBuffer } from "./video-buffer";

/**
 * A layer over a backend that answers reads of a video from its buffer. Everything else passes through. It is installed only when the
 * buffered player is switched on (see flag.ts), so removing it removes the feature.
 */
export class BufferingFilesystemBackend implements FilesystemBackend {
  private readonly buffers = new Set<VideoBuffer>();
  private readonly store = new BlockStore();

  constructor(
    private readonly underlying: FilesystemBackend,
    private readonly driveId: DriveId,
    /** An anonymous viewer of a public link leaves nothing behind when the player closes. */
    private readonly ephemeral: boolean,
  ) {}

  /** Opens the buffer of a file; the player closes it with `closeBuffer`. */
  openBuffer(fileStart: number, fileLength: number): VideoBuffer {
    const buffer = new VideoBuffer({
      underlying: this.underlying,
      driveId: this.driveId,
      fileStart,
      fileLength,
      fileKey: `${this.driveId}:${fileStart}:${fileLength}`,
      store: this.store,
    });
    this.buffers.add(buffer);
    return buffer;
  }

  closeBuffer(buffer: VideoBuffer): void {
    this.buffers.delete(buffer);
    void buffer.dispose(this.ephemeral);
  }

  async getDataBlock(driveId: DriveId, byteOffset: number, byteLength: number, cache?: boolean, signal?: AbortSignal): Promise<Uint8Array> {
    for (const buffer of this.buffers) {
      if (buffer.covers(byteOffset, byteLength)) return buffer.readPiece(byteOffset, byteLength);
    }
    return this.underlying.getDataBlock(driveId, byteOffset, byteLength, cache, signal);
  }

  getOperations(driveId: DriveId, startBytePos?: number): Promise<Uint8Array> {
    return this.underlying.getOperations(driveId, startBytePos);
  }

  saveOperation(driveId: DriveId, fsOperationData: Uint8Array): Promise<void> {
    return this.underlying.saveOperation(driveId, fsOperationData);
  }

  startUploadSession(driveId: DriveId, byteLength: number): Promise<SessionInfo> {
    return this.underlying.startUploadSession(driveId, byteLength);
  }

  finishUploadSession(sessionId: SessionId): Promise<void> {
    return this.underlying.finishUploadSession(sessionId);
  }

  saveDataBlock(sessionId: SessionId, bytes: Uint8Array, blockByteOffset: number, signal?: AbortSignal): Promise<void> {
    return this.underlying.saveDataBlock(sessionId, bytes, blockByteOffset, signal);
  }

  deleteDataRange(driveId: DriveId, start: number, end: number): Promise<void> {
    return this.underlying.deleteDataRange(driveId, start, end);
  }

  getActionLog(driveId: DriveId, limit: number, before?: number): Promise<DriveActionLogEntry[]> {
    return this.underlying.getActionLog(driveId, limit, before);
  }
}

let current: BufferingFilesystemBackend | undefined;

/** Wraps the backend of a drive in the buffering layer when the feature is on; the player finds the layer through `getBufferingBackend`. */
export function installVideoBuffer(backend: FilesystemBackend, driveId: DriveId, ephemeral: boolean, enabled: boolean): FilesystemBackend {
  if (!enabled) {
    current = undefined;
    return backend;
  }
  current = new BufferingFilesystemBackend(backend, driveId, ephemeral);
  return current;
}

export function getBufferingBackend(): BufferingFilesystemBackend | undefined {
  return current;
}
