import type { DriveId } from "../backend/drive-backend";
import { DriveClient } from "./drive-client";
import { OperationService } from "./operation-service";
import { PkiService } from "./pki-service";
import { TsaService } from "./tsa-service";
import { TimestampingOpsRepository } from "./timestamping-ops-repository";
import { SigningOpsRepository } from "./signing-ops-repository";
import { HashValidatingOpsRepository } from "./hash-validating-ops-repository";
import { SerializingOpsRepository } from "./serializing-ops-repository";
import { SplittingOpsRepository } from "./splitting-ops-repository";
import { FilesystemBackend } from "../backend/filesystem-backend";
import { AesEncryptor, generateKey } from "../core/enc";
import { EncryptingOpsRepository } from "./encrypting-ops-repository";
import { RestPkiBackend } from "../backend/pki-backend";
import { RestTsaBackend } from "../backend/tsa-backend";
import { UserId } from "../backend/user-backend";
import { base64ToUint8Array } from "../core/stream-utils";

const EncryptorImpl = AesEncryptor;
const PkiBackendImpl = RestPkiBackend;
const TsaBackendImpl = RestTsaBackend;

export class DriveClientFactory {
  public static async createDriveClient(
    userId: UserId,
    driveId: DriveId,
    driveName: string,
    userPrivateKey: CryptoKey,
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
    const pkiBackend = new PkiBackendImpl();
    const pkiService = new PkiService(pkiBackend);
    const signingOpsRepository = new SigningOpsRepository(hashValidatingOpsRepository, userId, userPrivateKey, pkiService);
    const tsaBackend = new TsaBackendImpl();
    const tsaService = new TsaService(tsaBackend, pkiService);
    const timestampingOpsRepository = new TimestampingOpsRepository(signingOpsRepository, tsaService);
    const operationService = new OperationService(timestampingOpsRepository);
    return {
      driveClient: new DriveClient(userId, driveId, driveName, operationService, filesystemBackend, keyEncoded, opsCounterNonce),
      keyEncoded
    };
  }
}
