import { concatArrays } from "../core/stream-utils";
import { EncryptingOpsRepository } from "./encrypting-ops-repository";

export class SplittingOpsRepository {
  public readonly OPS_SEPARATOR = new Uint8Array([195, 184, 234]);
  public readonly OPS_SEPARATOR_BYTE_LENGTH = this.OPS_SEPARATOR.length;
  private operationsRequested = false;
  private readonly encryptingOperationsRepository: EncryptingOpsRepository;

  constructor(encryptingOperationsRepository: EncryptingOpsRepository) {
    this.encryptingOperationsRepository = encryptingOperationsRepository;
  }

  public async saveOperation(opBytes: Uint8Array): Promise<void> {
    if (!this.operationsRequested) {
      throw new Error("Before saving operations getOperation method should be invoked at least once");
    }
    let bytesToSave = concatArrays(opBytes, this.OPS_SEPARATOR);
    bytesToSave = concatArrays(this.OPS_SEPARATOR, bytesToSave);
    await this.encryptingOperationsRepository.saveOperation(bytesToSave);
  }

  public async getOperations(startBytePos?: number): Promise<{ opBytes: Uint8Array, startBytePos: number, byteLength: number }[]> {
    this.operationsRequested = true;
    let initialPos = startBytePos !== undefined ? startBytePos : this.encryptingOperationsRepository.getReadBytePos();
    const bytes = await this.encryptingOperationsRepository.getOperations(startBytePos);
    if (bytes.byteLength === 0) {
      return [];
    }
    const res = [];
    let start = 0;
    let i = 0;
    while (i <= bytes.length - this.OPS_SEPARATOR_BYTE_LENGTH) {
      let match = true;
      for (let j = 0; j < this.OPS_SEPARATOR_BYTE_LENGTH; j++) {
        if (bytes[i + j] !== this.OPS_SEPARATOR[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        if (start !== i) {
          res.push({
            opBytes: bytes.slice(start, i),
            startBytePos: initialPos + start,
            byteLength: i - start
          });
        }
        start = i + this.OPS_SEPARATOR_BYTE_LENGTH;
        i = start - 1;
      }
      i++;
    }
    if (start < bytes.length) {
      res.push({
        opBytes: bytes.slice(start),
        startBytePos: initialPos + start,
        byteLength: bytes.length - start
      });
    }
    return res;
  }
}
