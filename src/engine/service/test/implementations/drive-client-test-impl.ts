import { getTestUserId } from "@/engine/backend/test/mocks/test-user-info";
import { base64ToUint8Array } from "@/engine/core/stream-utils";
import { DriveClient } from "../../drive-client";
import { getOperationService } from "./operation-service-test-impl";


export async function getTestDriveClient() {
    const testDriveName = "Test drive";
    const userId = getTestUserId();
    const e = await getOperationService();
    return new DriveClient(userId,
        e.driveInfo.id,
        testDriveName,
        e.operationService,
        e.filesystemBackend,
        e.keyEncoded,
        base64ToUint8Array(e.driveInfo.counterNonce)
    );
}
