import { UserId } from "../backend/user-backend";
import { importPublicKey, sign, verify } from "../core/enc-sig";
import { FsOperation } from "./fs-operation";
import { HashValidatingOpsRepository } from "./hash-validating-ops-repository";
import { OpsRepository, FsOperationWrapper, RejectionReason } from "./ops-repository";
import { PkiService } from "./pki-service";

export class SigningOpsRepository implements OpsRepository {
  private readonly hashIgnoreFields = ['createdBySig', 'previousOperationHash'];
  private readonly hashValidatingOpsRepository: HashValidatingOpsRepository;
  private readonly userId: UserId;
  private readonly userPrivateKey: CryptoKey;
  private readonly pkiService: PkiService;

  constructor(
    hashValidatingOpsRepository: HashValidatingOpsRepository,
    userId: UserId,
    userPrivateKey: CryptoKey,
    pkiService: PkiService
  ) {
    this.hashValidatingOpsRepository = hashValidatingOpsRepository;
    this.userId = userId;
    this.userPrivateKey = userPrivateKey;
    this.pkiService = pkiService;
  }

  async getOperations(startBytePos?: number, lastOperationHash?: string): Promise<FsOperationWrapper[]> {
    const ops: FsOperationWrapper[] = await this.hashValidatingOpsRepository.getOperations(startBytePos, lastOperationHash);
    for (const opWrapper of ops) {
      if (!opWrapper.valid) {
        continue;
      }
      const signatureIsValid = await this.verifyOpSignature(opWrapper.op!);
      if (!signatureIsValid) {
        opWrapper.valid = false;
        opWrapper.rejectionReason = RejectionReason.INVALID_USER_SIGNATURE;
      }
    }
    return ops;
  }

  async saveOperation(fsOperation: FsOperation): Promise<void> {
    fsOperation.createdBy = this.userId;
    fsOperation.createdBySig = null;
    const hash = await fsOperation.hashCode(this.hashIgnoreFields);
    fsOperation.createdBySig = await sign(hash, this.userPrivateKey);
    await this.hashValidatingOpsRepository.saveOperation(fsOperation);
  }

  async verifyOpSignature(op: FsOperation): Promise<boolean> {
    const signature = op.createdBySig;
    if (signature == null) {
      return false;
    }
    const publicKeyRequestResult = await this.pkiService.getUserPublicKey(op.createdBy);
    if (publicKeyRequestResult == null) {
      return false;
    }
    const publicKey = await importPublicKey(publicKeyRequestResult.publicKeyBase64);
    op.createdBySig = null;
    const previousOperationHash = op.previousOperationHash;
    op.previousOperationHash = null;
    const message = await op.hashCode(this.hashIgnoreFields);
    op.createdBySig = signature; // restore original message to avoid side effects
    op.previousOperationHash = previousOperationHash;
    return verify(message, signature, publicKey);
  }
}
