import { getRandomNonce } from "@/engine/core/enc";
import { uint8ArrayToBase64 } from "@/engine/core/stream-utils";
import { UserId } from "../../user-backend";
import { getTestUserId } from "./test-user-info";
import { DriveBackend, DriveId, DriveInfo, Privilege } from "../../drive-backend";

export class MockDriveBackend implements DriveBackend {
    private readonly drives = new Map<DriveId, DriveInfo>();
    private idSequence = 0;

    async createDrive(title: string): Promise<DriveInfo> {
        const newDriveId = this.idSequence.toString();
        this.idSequence++;
        const keyNonce = uint8ArrayToBase64(getRandomNonce());
        const counterNonce = uint8ArrayToBase64(getRandomNonce());
        const driveInfo = {
            id: newDriveId,
            title,
            ownerUserId: getTestUserId(),
            ACL: new Map<UserId, Set<Privilege>>(),
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
