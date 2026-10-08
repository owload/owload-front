import { getApiCall } from "../api/api";
import type { DriveActionLogEntry } from "../service/drive-action-log";
import type { DriveId } from "./drive-backend";
import { FilesystemBackend, SessionId, SessionInfo } from "./filesystem-backend";

/** Reading a public drive with its link, without signing in. Nothing can be written through the link, so those calls refuse. */
export class PublicFilesystemBackend implements FilesystemBackend {
    constructor(private readonly token: string) {}

    async getOperations(_driveId: DriveId, startBytePos: number): Promise<Uint8Array> {
        return new Uint8Array(await getApiCall(`/public/${this.token}/ops/${startBytePos}`, "arraybuffer"));
    }

    async getDataBlock(_driveId: DriveId, byteOffset: number, byteLength: number): Promise<Uint8Array> {
        if (byteLength <= 0) {
            throw new Error("byteLength is zero or negative: " + byteLength);
        }
        const url = `/public/${this.token}/data?start=${byteOffset}&end=${byteOffset + byteLength}`;
        const buf = await getApiCall<Uint8Array>(url, "arraybuffer", undefined, 1000);
        if (buf.byteLength > byteLength) {
            throw new Error(`Server responded with wrong data length. Requested: ${byteLength}, returned: ${buf.byteLength}`);
        }
        return new Uint8Array(buf);
    }

    async getActionLog(): Promise<DriveActionLogEntry[]> {
        return [];
    }

    async saveOperation(): Promise<void> {
        throw new Error("A public drive is read-only");
    }

    async startUploadSession(): Promise<SessionInfo> {
        throw new Error("A public drive is read-only");
    }

    async finishUploadSession(_sessionId: SessionId): Promise<void> {
        throw new Error("A public drive is read-only");
    }

    async saveDataBlock(): Promise<void> {
        throw new Error("A public drive is read-only");
    }

    async deleteDataRange(): Promise<void> {
        throw new Error("A public drive is read-only");
    }
}
