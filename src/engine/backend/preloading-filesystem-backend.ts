import { DriveId } from "./drive-backend";
import { FilesystemBackend, SessionId, SessionInfo } from "./filesystem-backend";

export class PreloadingFilesystemBackend implements FilesystemBackend {
    private readonly underlyingFilesystemBackend: FilesystemBackend;
    private readonly preloadOpsPromiseMap: Map<string, Promise<Uint8Array>> = new Map();

    constructor(underlyingFilesystemBackend: FilesystemBackend) {
        this.underlyingFilesystemBackend = underlyingFilesystemBackend;
    }

    async getOperations(driveId: DriveId, startBytePos: number): Promise<Uint8Array> {
        const existingPromise = this.getPreloadOpsPromise(driveId, startBytePos);
        if (existingPromise) {
            return existingPromise;
        } else {
            const newOpsPromise = this.underlyingFilesystemBackend.getOperations(driveId, startBytePos)
                .then((res) => {
                    this.removePreloadOpsPromise(driveId, startBytePos);
                    return res;
                });
            this.addPreloadOpsPromise(driveId, startBytePos, newOpsPromise);
            return newOpsPromise;
        }
    }

    async saveOperation(driveId: DriveId, fsOperationData: Uint8Array): Promise<void> {
        this.removeAllPreloadOpsPromises(driveId);
        return this.underlyingFilesystemBackend.saveOperation(driveId, fsOperationData);
    }

    async startUploadSession(driveId: DriveId, byteLength: number): Promise<SessionInfo> {
        this.removeAllPreloadOpsPromises(driveId);
        return this.underlyingFilesystemBackend.startUploadSession(driveId, byteLength);
    }

    async finishUploadSession(sessionId: SessionId): Promise<void> {
        return this.underlyingFilesystemBackend.finishUploadSession(sessionId);
    }

    async saveDataBlock(sessionId: SessionId, bytes: Uint8Array, blockByteOffset: number, signal?: AbortSignal): Promise<void> {
        return this.underlyingFilesystemBackend.saveDataBlock(sessionId, bytes, blockByteOffset, signal);
    }

    async getDataBlock(driveId: DriveId, byteOffset: number, byteLength: number, cache = false): Promise<Uint8Array> {
        return this.underlyingFilesystemBackend.getDataBlock(driveId, byteOffset, byteLength, cache);
    }

    private generatePreloadOpsPromiseMapKey(driveId: DriveId, startBytePos: number): string {
        return `${driveId}-${startBytePos}`;
    }

    private addPreloadOpsPromise(driveId: DriveId, startBytePos: number, promise: Promise<Uint8Array>) {
        const key = this.generatePreloadOpsPromiseMapKey(driveId, startBytePos);
        this.preloadOpsPromiseMap.set(key, promise);
    }

    private removePreloadOpsPromise(driveId: DriveId, startBytePos: number) {
        const key = this.generatePreloadOpsPromiseMapKey(driveId, startBytePos);
        this.preloadOpsPromiseMap.delete(key);
    }

    private removeAllPreloadOpsPromises(driveId: DriveId) {
        const keysToRemove: string[] = [];
        for (const key of this.preloadOpsPromiseMap.keys()) {
            if (key.startsWith(driveId)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            this.preloadOpsPromiseMap.delete(key);
        }
    }

    private getPreloadOpsPromise(driveId: DriveId, startBytePos: number): Promise<Uint8Array> | undefined {
        const key = this.generatePreloadOpsPromiseMapKey(driveId, startBytePos);
        return this.preloadOpsPromiseMap.get(key);
    }

    async preloadOperations(driveId: DriveId, startBytePos: number) {
        const existingPromise = this.getPreloadOpsPromise(driveId, startBytePos);
        if (existingPromise) {
            return;
        }
        const newPromise = this.underlyingFilesystemBackend.getOperations(driveId, startBytePos);
        this.addPreloadOpsPromise(driveId, startBytePos, newPromise);
    }
}