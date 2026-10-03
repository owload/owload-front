import { DriveId } from "../backend/drive-backend";
import { FilesystemBackend } from "../backend/filesystem-backend";
import { Encryptor } from "../core/enc";


export class EncryptingOpsRepository {
  private readonly driveId: DriveId;
  private readonly filesystemBackend: FilesystemBackend;
  private readonly encryptor: Encryptor<Uint8Array>;
  private readBytePos = 0;
  private writeBytePos?: number = undefined;

  constructor(driveId: DriveId, filesystemBackend: FilesystemBackend, encryptor: Encryptor<Uint8Array>) {
    this.driveId = driveId;
    this.filesystemBackend = filesystemBackend;
    this.encryptor = encryptor;
  }

  public async getOperations(startBytePos?: number): Promise<Uint8Array> {
    if (startBytePos === undefined) {
      startBytePos = this.readBytePos;
    }
    const opsEncryptedData = await this.filesystemBackend.getOperations(this.driveId, startBytePos);
    this.readBytePos = startBytePos + opsEncryptedData.byteLength;
    this.writeBytePos = this.readBytePos;
    return this.encryptor.decrypt(opsEncryptedData, startBytePos);
  }

  public async saveOperation(fsOperationBytes: Uint8Array): Promise<void> {
    if(this.writeBytePos === undefined) {
      throw new Error("Before saving operations getOperation method should be invoked at least once");
    }
    const curWriteBytePos = this.writeBytePos;
    this.writeBytePos += fsOperationBytes.byteLength;
    const fsOperationEncryptedData = await this.encryptor.encrypt(fsOperationBytes, curWriteBytePos);
    // TODO: if result false - do not increase counter - check elsewhere
    await this.filesystemBackend.saveOperation(this.driveId, fsOperationEncryptedData);
  }

  public getReadBytePos(): number {
    return this.readBytePos;
  }
}
