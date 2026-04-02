import { FsOperation } from "./fs-operation";
import { FsOperationWrapper, RejectionReason } from "./ops-repository";
import { SigningOpsRepository } from "./signing-ops-repository";
import { TsaService } from "./tsa-service";

export class TimestampingOpsRepository {
  private readonly hashIgnoreFields = ['tsaId', 'timestamp', 'timestampSig', 'createdBySig', 'previousOperationHash'];
  private readonly signingOpsRepository: SigningOpsRepository;
  private readonly tsaService: TsaService;

  constructor(signingOpsRepository: SigningOpsRepository, tsaService: TsaService) {
    this.signingOpsRepository = signingOpsRepository;
    this.tsaService = tsaService;
  }

  async getOperations(startBytePos?: number, lastOperationHash?: string): Promise<FsOperationWrapper[]> {
    const ops: FsOperationWrapper[] = await this.signingOpsRepository.getOperations(startBytePos, lastOperationHash);
    for (const opWrapper of ops) {
      if (!opWrapper.valid) {
        continue;
      }
      const timestampIsValid = await this.verifyOpTimestamp(opWrapper.op!);
      if (!timestampIsValid) {
        opWrapper.valid = false;
        opWrapper.rejectionReason = RejectionReason.INVALID_TIMESTAMP;
      }
    }
    return ops;
  }

  async saveOperation(fsOperation: FsOperation): Promise<void> {
    const { tsaId, timestamp, signature } = await this.tsaService.getTimestamp(
      await fsOperation.hashCode(this.hashIgnoreFields)
    );
    fsOperation.tsaId = tsaId;
    fsOperation.timestamp = timestamp;
    fsOperation.timestampSig = signature;
    await this.signingOpsRepository.saveOperation(fsOperation);
  }

  async verifyOpTimestamp(op: FsOperation): Promise<boolean> {
    if (op.tsaId == null || op.timestamp == null || op.timestampSig == null) {
      return false;
    }
    const hash = await op.hashCode(this.hashIgnoreFields);
    return this.tsaService.verifyTimestamp(hash, op.timestamp, op.timestampSig, op.tsaId);
  }
}
