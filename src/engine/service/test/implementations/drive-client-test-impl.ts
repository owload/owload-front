import { deriveStreamKey } from "@/engine/core/enc";
import { base64ToUint8Array } from "@/engine/core/stream-utils";
import { DriveClient, DriveStreamKeys } from "../../drive-client";
import { getOperationService } from "./operation-service-test-impl";


export async function getTestDriveClient() {
    const testDriveName = "Test drive";
    const e = await getOperationService();
    const counterNonce = base64ToUint8Array(e.driveInfo.counterNonce);
    const streamKeys: DriveStreamKeys = {
        data: await deriveStreamKey(e.keyEncoded, counterNonce, 'owload-data-v2'),
        cacheFsState: await deriveStreamKey(e.keyEncoded, counterNonce, 'owload-cache-fsstate-v2'),
        cacheActLog: await deriveStreamKey(e.keyEncoded, counterNonce, 'owload-cache-actlog-v2'),
        cacheOpLog: await deriveStreamKey(e.keyEncoded, counterNonce, 'owload-cache-oplog-v2'),
        cacheKeys: await deriveStreamKey(e.keyEncoded, counterNonce, 'owload-cache-keys-v2'),
    };
    return new DriveClient(
        e.driveInfo.id,
        testDriveName,
        e.operationService,
        e.filesystemBackend,
        streamKeys,
        counterNonce
    );
}
