import { deleteApiCall, getApiCall, postApiCall } from "../api/api";
import { DriveId } from "./drive-backend";
import { FilesystemBackend, SessionId, SessionInfo } from "./filesystem-backend";
import { DriveActionLogEntry } from "../service/drive-action-log";

export class RestFilesystemBackend implements FilesystemBackend {
    async getOperations(driveId: DriveId, startBytePos: number): Promise<Uint8Array> {
        return new Uint8Array(await getApiCall(`/ops/${driveId}/${startBytePos}`, "arraybuffer"));
    }

    async saveOperation(driveId: DriveId, fsOperationData: Uint8Array): Promise<void> {
        return postApiCall(`/ops/${driveId}`, fsOperationData);
    }

    async startUploadSession(driveId: DriveId, byteLength: number): Promise<SessionInfo> {
        return postApiCall(`/sessions?driveId=${driveId}&byteLength=${byteLength}`);
    }

    async finishUploadSession(sessionId: SessionId): Promise<void> {
        return postApiCall(`/sessions/finalize/${sessionId}`);
    }

    async saveDataBlock(sessionId: SessionId, bytes: Uint8Array, blockByteOffset: number, signal?: AbortSignal): Promise<void> {
        return postApiCall(`/data?sessionId=${sessionId}&start=${blockByteOffset}`, bytes, "arraybuffer", signal, 1000);
    }

    async getDataBlock(driveId: DriveId, byteOffset: number, byteLength: number): Promise<Uint8Array> {
        if (byteLength <= 0) {
            throw new Error("byteLength is zero or negative: " + byteLength)
        }
        const url = `/data?driveId=${driveId}&start=${byteOffset}&end=${byteOffset + byteLength}`;
        let buf;
        buf = await getApiCall<Uint8Array>(url, "arraybuffer", undefined, 1000);

        if (buf.byteLength > byteLength) {
            throw new Error(`Server responded with wrong data length. Requested: ${byteLength}, returned: ${buf.byteLength}`)
        }
        return new Uint8Array(buf);
    }

    async deleteDataRange(driveId: DriveId, start: number, end: number): Promise<void> {
        return deleteApiCall(`/data?driveId=${driveId}&start=${start}&end=${end}`);
    }

    async getActionLog(driveId: DriveId, limit: number, offset: number): Promise<DriveActionLogEntry[]> {
        return getApiCall<DriveActionLogEntry[]>(`/drives/${driveId}/actions?limit=${limit}&offset=${offset}`);
    }
}
