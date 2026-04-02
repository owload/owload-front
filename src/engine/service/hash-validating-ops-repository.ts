import { FsOperation } from "./fs-operation";
import { OpsRepository, FsOperationWrapper, RejectionReason } from "./ops-repository";
import { SerializingOpsRepository } from "./serializing-ops-repository";



export class HashValidatingOpsRepository implements OpsRepository {
  private readonly serializingOpsRepository: SerializingOpsRepository;
  private lastReadHash: string = '';
  private lastSaveHash: string = '';

  constructor(serializingOpsRepository: SerializingOpsRepository) {
    this.serializingOpsRepository = serializingOpsRepository;
  }

  public async getOperations(startBytePos?: number, lastOperationHash?: string): Promise<FsOperationWrapper[]> {
    const ops: FsOperationWrapper[] = await this.serializingOpsRepository.getOperations(startBytePos);
    if (lastOperationHash !== undefined) {
      this.lastReadHash = lastOperationHash;
    }
    if (startBytePos === 0) {
      this.lastReadHash = '';
    }
    for (const opWrapper of ops) {
      if (!opWrapper.valid) {
        continue;
      }
      if (opWrapper.op!.previousOperationHash !== this.lastReadHash) {
        opWrapper.valid = false;
        opWrapper.rejectionReason = RejectionReason.INVALID_PREV_OPERATION_HASH;
      } else {
        this.lastReadHash = await opWrapper.op!.hashCode();
      }
    }
    this.lastSaveHash = this.lastReadHash;
    return ops;
  }

  public async saveOperation(fsOperation: FsOperation): Promise<void> {
    fsOperation.previousOperationHash = this.lastSaveHash;
    this.lastSaveHash = await fsOperation.hashCode();
    await this.serializingOpsRepository.saveOperation(fsOperation);
  }
}
