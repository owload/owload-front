import { concatArrays } from "@/engine/core/stream-utils";
import { DriveBackend, DriveId } from "../../drive-backend";
import { FilesystemBackend, SessionId, SessionInfo, SessionStatus } from "../../filesystem-backend";

export class MockFilesystemBackend implements FilesystemBackend {
    private readonly MAX_DELAY_MS = 0;
    private readonly driveBackend: DriveBackend;
    private readonly operationsStorage = new Map<DriveId, Uint8Array>();
    private readonly dataStorage = new Map<DriveId, Uint8Array>();
    private sessionIdSequence = 0;
    private readonly sessionsMap = new Map<SessionId, SessionInfo>;
    private readonly sessionByteOffsetsMap = new Map<DriveId, number>;

    // TODO: add ACL check

    public constructor(driveBackend: DriveBackend) {
        this.driveBackend = driveBackend;
    }

    async getOperations(driveId: DriveId, startBytePos: number): Promise<Uint8Array> {
        await this.wait();
        if (!(startBytePos >= 0)) {
            // TODO: elaborate error types
            throw new Error(`Illegal startBytePos: ${startBytePos}`);
        }
        let opsData = this.operationsStorage.get(driveId);
        if (opsData === undefined) {
            if (!(await this.checkIfDriveExists(driveId))) {
                // TODO: elaborate error types
                throw new Error(`Drive with id ${driveId} not found`);
            } else {
                await this.wait();
                return new Uint8Array(0);
            }
        }
        if (startBytePos) {
            opsData = opsData.slice(startBytePos);
        }
        await this.wait();
        return opsData;
    }

    async saveOperation(driveId: DriveId, fsOperationData: Uint8Array): Promise<void> {
        await this.wait();
        let opsData = this.operationsStorage.get(driveId);
        if (opsData === undefined) {
            if (!(await this.checkIfDriveExists(driveId))) {
                // TODO: elaborate error types
                throw new Error(`Drive with id ${driveId} not found`);
            }
        }
        opsData = this.operationsStorage.get(driveId);
        if (opsData === undefined) {
            this.operationsStorage.set(driveId, fsOperationData);
        } else {
            const newOpsData = concatArrays(opsData, fsOperationData);
            this.operationsStorage.set(driveId, newOpsData);
        }
        await this.wait();
    }

    async startUploadSession(driveId: DriveId, byteLength: number): Promise<SessionInfo> {
        // TODO: check if drive exists
        const sessionId = this.sessionIdSequence.toString();
        this.sessionIdSequence++;
        const byteOffset = this.sessionByteOffsetsMap.get(driveId) || 0;
        this.sessionByteOffsetsMap.set(driveId, byteOffset + byteLength);
        const sessionInfo: SessionInfo = {
            sessionId,
            byteOffset,
            byteLength,
            driveId,
            createdTimestamp: Date.now(),
            lastWriteTimestamp: 0,
            status: SessionStatus.ACTIVE
        };
        this.sessionsMap.set(sessionId, sessionInfo);
        let driveData = this.dataStorage.get(driveId) || new Uint8Array(0);
        const extendedDriveData = concatArrays(driveData, new Uint8Array(byteLength));
        this.dataStorage.set(driveId, extendedDriveData);
        return sessionInfo;
    }

    async finishUploadSession(sessionId: SessionId): Promise<void> {
        const sessionInfo = this.sessionsMap.get(sessionId);
        if (sessionInfo === undefined) {
            // TODO: elaborate error types
            throw new Error(`Session with provided id does not exist: ${sessionId}`);
        }
        if (sessionInfo.status === SessionStatus.STALE || sessionInfo.status === SessionStatus.FINISHED) {
            // TODO: elaborate error types
            throw new Error(`Session with provided id is closed: ${sessionId}`);
        }
        sessionInfo.status = SessionStatus.FINISHED;
    }

    async saveDataBlock(sessionId: SessionId, bytes: Uint8Array, blockByteOffset: number): Promise<void> {
        const sessionInfo = this.sessionsMap.get(sessionId);
        if (sessionInfo === undefined) {
            // TODO: elaborate error types
            throw new Error(`Session with provided id does not exist: ${sessionId}`);
        }
        sessionInfo.lastWriteTimestamp = Date.now();
        const driveData = this.dataStorage.get(sessionInfo.driveId);
        if (!driveData) {
            throw new Error("driveData is undefined");
        }
        driveData.set(bytes, sessionInfo.byteOffset + blockByteOffset);
    }

    async getDataBlock(driveId: DriveId, byteOffset: number, byteLength: number): Promise<Uint8Array> {
        const driveData = this.dataStorage.get(driveId);
        if (!driveData) {
            throw new Error("driveData is undefined");
        }
        return driveData.slice(byteOffset, byteOffset + byteLength);
    }

    async preloadOperations() {
        // no preloading in Mock backend
    }

    private async checkIfDriveExists(driveId: DriveId): Promise<boolean> {
        await this.wait();
        try {
            await this.driveBackend.getDriveInfo(driveId);
            return true;
        } catch (_) {
            // TODO: catch only does not exist otherwise rethrow
            return false;
        }
    }

    private async wait() {
        const delay = Math.floor(Math.random() * this.MAX_DELAY_MS);
        await new Promise((r) => setTimeout(r, delay));
    }
}
