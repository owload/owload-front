import { base64ToUint8Array } from "@/engine/core/stream-utils";
import { DriveClient } from "../../drive-client";
import { getOperationService } from "./operation-service-test-impl";


export async function getTestDriveClient() {
    const testDriveName = "Test drive";
    const e = await getOperationService();
    return new DriveClient(
        e.driveInfo.id,
        testDriveName,
        e.operationService,
        e.filesystemBackend,
        e.keyEncoded,
        base64ToUint8Array(e.driveInfo.counterNonce)
    );
}
