import { getRandomNonce } from "@/engine/core/enc";
import { uint8ArrayToBase64 } from "@/engine/core/stream-utils";
import { getTestUserId } from "./test-user-info";
import { CustomTargetDeletionDecision, CustomStorageConfig, DriveBackend, RestoreResult, RestoreScanResult, DriveId, DriveInfo, DriveStorageTarget, S3Preset, StorageTargetInput } from "../../drive-backend";

export class MockDriveBackend implements DriveBackend {
    private readonly drives = new Map<DriveId, DriveInfo>();
    private idSequence = 0;

    async getS3Presets(): Promise<S3Preset[]> {
        return [];
    }

    async deleteDrive(driveId: DriveId, _customTargetDecisions: CustomTargetDeletionDecision[], _force?: boolean): Promise<void> {
        this.drives.delete(driveId);
    }

    async addStorageTarget(_driveId: DriveId, _target: StorageTargetInput): Promise<void> {}
    async getStorageTargets(_driveId: DriveId): Promise<DriveStorageTarget[]> { return []; }
    async makeMaster(_driveId: DriveId, _targetId: string): Promise<void> {}
    async deleteStorageTarget(_driveId: DriveId, _targetId: string, _force?: boolean): Promise<void> {}
    async testCustomConfig(_config: import('../../drive-backend').CustomStorageConfig): Promise<{ ok: boolean; error?: string }> { return { ok: true }; }
    async testStorageTarget(_driveId: DriveId, _targetId: string): Promise<{ ok: boolean; error?: string }> { return { ok: true }; }
    async testPreset(_presetId: string): Promise<{ ok: boolean; error?: string }> { return { ok: true }; }
    async scanRestorableDrives(_config: CustomStorageConfig): Promise<RestoreScanResult> { return { drives: [], truncated: false }; }
    async restoreDrives(_config: CustomStorageConfig, _driveIds: DriveId[]): Promise<RestoreResult[]> { return []; }

    async createDrive(title: string, _storageTarget?: StorageTargetInput): Promise<DriveInfo> {
        const newDriveId = this.idSequence.toString();
        this.idSequence++;
        const keyNonce = uint8ArrayToBase64(getRandomNonce());
        const counterNonce = uint8ArrayToBase64(getRandomNonce());
        const driveInfo = {
            id: newDriveId,
            title,
            ownerUserId: getTestUserId(),
            ACL: {},
            visibility: "private" as const,
            myRole: "owner" as const,
            peopleCount: 0,
            ownerName: null,
            ownerEmail: null,
            createdTimestamp: Date.now(),
            keyNonce,
            counterNonce
        };
        this.drives.set(newDriveId, driveInfo);
        return driveInfo;
    }

    async getAccessibleDrives(): Promise<any> {
        throw new Error('Not implemented');
    }

    // TODO: add ACL checks
    async getDriveInfo(driveId: DriveId): Promise<DriveInfo> {
        const driveInfo = this.drives.get(driveId);
        if (driveInfo === undefined) {
            // TODO: elaborate error types
            throw new Error(`Drive with id ${driveId} does not exist or access denied`);
        }
        return driveInfo;
    }
}
