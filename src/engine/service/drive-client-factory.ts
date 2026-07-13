import type { DriveId } from "../backend/drive-backend";
import { DriveClient } from "./drive-client";
import { OperationService } from "./operation-service";
import { HashValidatingOpsRepository } from "./hash-validating-ops-repository";
import { SerializingOpsRepository } from "./serializing-ops-repository";
import { SplittingOpsRepository } from "./splitting-ops-repository";
import { FilesystemBackend } from "../backend/filesystem-backend";
import { AesEncryptor, generateKey } from "../core/enc";
import { EncryptingOpsRepository } from "./encrypting-ops-repository";
import { UserId } from "../backend/user-backend";
import { base64ToUint8Array } from "../core/stream-utils";

const EncryptorImpl = AesEncryptor;

export class DriveClientFactory {
  public static async createDriveClient(
    userId: UserId,
    driveId: DriveId,
    driveName: string,
    keyEncoded: CryptoKey | undefined,
    driveKeyNonce: string,
    driveCounterNonce: string,
    password: string | undefined,
    filesystemBackend: FilesystemBackend
  ): Promise<{ driveClient: DriveClient; keyEncoded: CryptoKey }> {
    if (!keyEncoded && !password) {
      throw new Error("Either keyEncoded or password should be provided");
    }
    
    if (!keyEncoded) {
      keyEncoded = await generateKey(password!, base64ToUint8Array(driveKeyNonce), true);
    }
    const opsCounterNonce = base64ToUint8Array(driveCounterNonce);
    const encryptor = new EncryptorImpl<Uint8Array>(keyEncoded, opsCounterNonce);
    const encryptingOpsRepository = new EncryptingOpsRepository(driveId, filesystemBackend, encryptor);
    const splittingOpsRepository = new SplittingOpsRepository(encryptingOpsRepository);
    const serializingOpsRepository = new SerializingOpsRepository(splittingOpsRepository);
    const hashValidatingOpsRepository = new HashValidatingOpsRepository(serializingOpsRepository);
    const operationService = new OperationService(hashValidatingOpsRepository);
    return {
      driveClient: new DriveClient(userId, driveId, driveName, operationService, filesystemBackend, keyEncoded, opsCounterNonce),
      keyEncoded
    };
  }
}
