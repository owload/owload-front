import { FsOperation } from "./fs-operation";
import { OpsRepository, FsOperationWrapper, RejectionReason } from "./ops-repository";
import { SplittingOpsRepository } from "./splitting-ops-repository";

export class SerializingOpsRepository implements OpsRepository {
  private readonly splittingOpsRepository: SplittingOpsRepository;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  constructor(splittingOpsRepository: SplittingOpsRepository) {
    this.splittingOpsRepository = splittingOpsRepository;
  }

  public async getOperations(startBytePos?: number): Promise<FsOperationWrapper[]> {
    const opBytesArray = await this.splittingOpsRepository.getOperations(startBytePos);
    const fsOperationArray: FsOperationWrapper[] = [];
    for (const opBytes of opBytesArray) {
      const newOp: FsOperationWrapper = {
        opStr: this.decoder.decode(opBytes.opBytes),
        startBytePos: opBytes.startBytePos,
        byteLength: opBytes.byteLength,
        valid: true
      }
      try {
        const fsOperation = FsOperation.deserialize(newOp.opStr);
        newOp.op = fsOperation;
        fsOperationArray.push(newOp);
      } catch (e) {
        newOp.valid = false;
        newOp.rejectionReason = RejectionReason.DESERIALIZATION_ERROR;
        fsOperationArray.push(newOp);
      }
    }
    return fsOperationArray;
  }

  public async saveOperation(fsOperation: FsOperation): Promise<void> {
    await this.splittingOpsRepository.saveOperation(this.encoder.encode(fsOperation.serialize()));
  }
}
