import { concatArrays } from "../core/stream-utils";
import { getCachedUint8Value, setCachedValue } from "./caches";
import { DriveId } from "./drive-backend";
import { FilesystemBackend, SessionId, SessionInfo } from "./filesystem-backend";

export class CachingFilesystemBackend implements FilesystemBackend {
  private readonly OPS_CACHE_ENABLED = false;
  private readonly OPS_CACHE = "OPS_CACHE_1";
  private readonly DATA_CACHE = "DATA_CACHE_1";
  private readonly underlyingFilesystemBackend: FilesystemBackend;

  constructor(underlyingFilesystemBackend: FilesystemBackend) {
    this.underlyingFilesystemBackend = underlyingFilesystemBackend;
  }

  async getOperations(driveId: DriveId, startBytePos = 0): Promise<Uint8Array> {
    if (this.OPS_CACHE_ENABLED) {
      return this.getOperationsWithCache(driveId, startBytePos);
    } else {
      return this.underlyingFilesystemBackend.getOperations(driveId, startBytePos);
    }
  }

  private async getOperationsWithCache(driveId: DriveId, startBytePos = 0): Promise<Uint8Array> {
    if (startBytePos < 0) {
      throw new Error("startBytePos is negative: " + startBytePos);
    }
    const cachedOps = await this.loadOpsFromCache(driveId);
    if (startBytePos <= cachedOps.length) {
      const newOps = await this.underlyingFilesystemBackend.getOperations(driveId, cachedOps.length);
      const allOps = concatArrays(cachedOps, newOps);
      await this.setOpsCache(driveId, allOps);
      return allOps.slice(startBytePos);
    } else {
      console.warn("Cache is not supported or out of sync. Loading data from server.");
      return this.underlyingFilesystemBackend.getOperations(driveId, startBytePos);
    }
  }

  async saveOperation(driveId: DriveId, fsOperationData: Uint8Array): Promise<void> {
    return this.underlyingFilesystemBackend.saveOperation(driveId, fsOperationData);
  }

  async startUploadSession(driveId: DriveId, byteLength: number): Promise<SessionInfo> {
    return this.underlyingFilesystemBackend.startUploadSession(driveId, byteLength);
  }

  async finishUploadSession(sessionId: SessionId): Promise<void> {
    return this.underlyingFilesystemBackend.finishUploadSession(sessionId);
  }

  async saveDataBlock(sessionId: SessionId, bytes: Uint8Array, blockByteOffset: number, signal?: AbortSignal): Promise<void> {
    return this.underlyingFilesystemBackend.saveDataBlock(sessionId, bytes, blockByteOffset, signal);
  }

  async getDataBlock(driveId: DriveId, byteOffset: number, byteLength: number, cache = false): Promise<Uint8Array> {
    if (byteLength <= 0) {
      throw new Error("byteLength is zero or negative: " + byteLength)
    }
    const url = `/data?containerId=${driveId}&start=${byteOffset}&end=${byteOffset + byteLength}`;
    let buf;
    if (cache) {
      buf = await getCachedUint8Value(this.DATA_CACHE, url);
    }
    if (!buf) {
      buf = await this.underlyingFilesystemBackend.getDataBlock(driveId, byteOffset, byteLength)
      if (cache) {
        await setCachedValue<Uint8Array>(this.DATA_CACHE, url, buf);
      }
    }
    if (buf.byteLength > byteLength) {
      throw new Error(`Server responded with wrong data length. Requested: ${byteLength}, returned: ${buf.byteLength}`)
    }
    return new Uint8Array(buf);
  }

  async clearCache(driveId: DriveId) {
    await setCachedValue<Uint8Array>(this.OPS_CACHE, driveId, new Uint8Array());
    await setCachedValue<Uint8Array>(this.DATA_CACHE, driveId, new Uint8Array());
  }

  private async setOpsCache(driveId: DriveId, ops: Uint8Array) {
    await setCachedValue<Uint8Array>(this.OPS_CACHE, driveId, ops);
  }

  private async loadOpsFromCache(driveId: DriveId) {
    return await getCachedUint8Value(this.OPS_CACHE, driveId) || new Uint8Array();
  }
}