import { FsOperation } from "./fs-operation";
import { FsOperationWrapper, OpsRepository } from "./ops-repository";


export interface SaveOperationResult {
  ok: boolean;
  newOperations: FsOperationWrapper[];
};

export class OperationService {
  private readonly underlyingOpsRepository: OpsRepository;
  private readonly saveRetriesCount: number;

  constructor(underlyingOpsRepository: OpsRepository, saveRetriesCount: number = 5) {
    this.underlyingOpsRepository = underlyingOpsRepository;
    this.saveRetriesCount = saveRetriesCount;
  }

  public async getOperations(startBytePos?: number, lastOperationHash?: string): Promise<FsOperationWrapper[]> {
    return this.underlyingOpsRepository.getOperations(startBytePos, lastOperationHash);
  }

  public async saveOperation(fsOperation: FsOperation): Promise<SaveOperationResult> {
    const newOperations: FsOperationWrapper[] = [];
    let result = false;
    for (let i = 0; i < this.saveRetriesCount; i++) {
      const saveRes = await this.trySaveOperation(fsOperation);
      newOperations.push(...saveRes.newOperations);
      if (saveRes.ok) {
        result = true;
        break;
      }
    }
    return {
      ok: result,
      newOperations,
    };
  }

  private async trySaveOperation(fsOperation: FsOperation): Promise<SaveOperationResult> {
    const newOperations = await this.underlyingOpsRepository.getOperations();
    let result = false;
    await this.underlyingOpsRepository.saveOperation(fsOperation);
    const opsArr = await this.underlyingOpsRepository.getOperations();
    newOperations.push(...opsArr);
    if (this.containsOp(opsArr, fsOperation)) {
      result = true;
    }
    return {
      ok: result,
      newOperations,
    };
  }

  private containsOp(opsArr: FsOperationWrapper[], fsOperation: FsOperation): boolean {
    for (let opWrapper of opsArr) {
      if (opWrapper.op != undefined && fsOperation.equals(opWrapper.op)) {
        return true;
      }
    }
    return false;
  }
}
