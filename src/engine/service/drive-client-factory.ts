import type { DriveId } from "../backend/drive-backend";
import { DriveClient, DriveStreamKeys } from "./drive-client";
import { OperationService } from "./operation-service";
import { HashValidatingOpsRepository } from "./hash-validating-ops-repository";
import { SerializingOpsRepository } from "./serializing-ops-repository";
import { SplittingOpsRepository } from "./splitting-ops-repository";
import { FilesystemBackend } from "../backend/filesystem-backend";
import { AesEncryptor, deriveStreamKey, generateKey } from "../core/enc";
import { EncryptingOpsRepository } from "./encrypting-ops-repository";
import { base64ToUint8Array } from "../core/stream-utils";

const EncryptorImpl = AesEncryptor;

export class DriveClientFactory {
  public static async createDriveClient(
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
    const counterNonce = base64ToUint8Array(driveCounterNonce);

    const [K_ops, K_data, K_cacheFsState, K_cacheActLog, K_cacheOpLog, K_cacheKeys] = await Promise.all([
      deriveStreamKey(keyEncoded, counterNonce, 'owload-ops-v2'),
      deriveStreamKey(keyEncoded, counterNonce, 'owload-data-v2'),
      deriveStreamKey(keyEncoded, counterNonce, 'owload-cache-fsstate-v2'),
      deriveStreamKey(keyEncoded, counterNonce, 'owload-cache-actlog-v2'),
      deriveStreamKey(keyEncoded, counterNonce, 'owload-cache-oplog-v2'),
      deriveStreamKey(keyEncoded, counterNonce, 'owload-cache-keys-v2'),
    ]);

    const encryptor = new EncryptorImpl<Uint8Array>(K_ops, counterNonce);
    const encryptingOpsRepository = new EncryptingOpsRepository(driveId, filesystemBackend, encryptor);
    const splittingOpsRepository = new SplittingOpsRepository(encryptingOpsRepository);
    const serializingOpsRepository = new SerializingOpsRepository(splittingOpsRepository);
    const hashValidatingOpsRepository = new HashValidatingOpsRepository(serializingOpsRepository);
    const operationService = new OperationService(hashValidatingOpsRepository);

    const streamKeys: DriveStreamKeys = {
      data: K_data,
      cacheFsState: K_cacheFsState,
      cacheActLog: K_cacheActLog,
      cacheOpLog: K_cacheOpLog,
      cacheKeys: K_cacheKeys,
    };

    return {
      driveClient: new DriveClient(driveId, driveName, operationService, filesystemBackend, streamKeys, counterNonce),
      keyEncoded
    };
  }
}
