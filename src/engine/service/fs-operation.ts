import { uint8ArrayToBase64 } from "../core/stream-utils";

const OP_HASH_ALG: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256';
const OP_HASH_BYTES = 9; // 72-bit truncated hash → 12 base64 chars, sufficient for tamper-evident log

export enum FsOperationType {
  MK_DIR,
  RM,
  MV,
  CP,
  RENAME,
  START_UPLOAD,
  FINISH_UPLOAD,
  DESCRIPTION
}

export abstract class FsOperation {
  randomStr: string;
  previousOperationHash: string | null = null;
  operationType: FsOperationType;

  protected constructor(operationType: FsOperationType, randomStr?: string) {
    this.operationType = operationType;
    this.randomStr = randomStr ? randomStr : this.getRandomStr();
  }

  private getRandomStr(): string {
    const RANDOM_BYTES_LEN = 5;
    const u8arr = new Uint8Array(RANDOM_BYTES_LEN);
    return uint8ArrayToBase64(crypto.getRandomValues(u8arr));
  }

  public serialize(): string {
    return (
      (this.randomStr != null ? '"' + this.randomStr + '"' : 'null') +
      ',' +
      (this.previousOperationHash != null ? '"' + this.previousOperationHash + '"' : 'null') +
      ',' +
      this.operationType +
      ',' +
      this.serializeAttributes()
    );
  }

  protected abstract serializeAttributes(): string;

  public static deserialize(persistentString: string): FsOperation {
    const [
      randomStr,
      previousOperationHash,
      opType,
      opAttributes,
    ] = JSON.parse('[' + persistentString + ']');
    const fsOperation = this.createOperation(opType, opAttributes, randomStr);
    fsOperation.previousOperationHash = previousOperationHash;
    return fsOperation;
  }

  private static createOperation(
    opType: FsOperationType,
    opAttributes: Array<any>,
    randomStr?: string
  ): FsOperation {
    switch (opType) {
      case FsOperationType.MK_DIR:
        return new MkDirFsOperation(opAttributes[0], randomStr);
      case FsOperationType.RM:
        return new RmFsOperation(opAttributes[0], opAttributes[1] as string[], randomStr);
      case FsOperationType.RENAME:
        return new RenameFsOperation(opAttributes[0], opAttributes[1], randomStr);
      case FsOperationType.MV:
        return new MvFsOperation(opAttributes[0], opAttributes[1], opAttributes[2], opAttributes[3], opAttributes[4], randomStr);
      case FsOperationType.CP:
        return new CpFsOperation(opAttributes[0], opAttributes[1], opAttributes[2], opAttributes[3], opAttributes[4], randomStr);
      case FsOperationType.START_UPLOAD:
        return new UploadStartFsOperation(opAttributes[0], opAttributes[1], opAttributes[2], opAttributes[3], randomStr);
      case FsOperationType.FINISH_UPLOAD:
        return new UploadFinishFsOperation(opAttributes[0], opAttributes[1], randomStr);
      case FsOperationType.DESCRIPTION:
        return new DescriptionFsOperation(opAttributes[0], randomStr);
      default:
        throw new Error('Unsupported operation type: ' + opType);
    }
  }

  public async hashCode(ignoreFields?: string[]): Promise<string> {
    if (ignoreFields === undefined) {
      return this.allFieldsHashCode();
    }
    return this.customFieldsHashCode(ignoreFields);
  }

  private async customFieldsHashCode(ignoreFields: string[]): Promise<string> {
    if (ignoreFields.includes('operationType')) {
      throw new Error('Field operationType is mandatory for hashing');
    }
    const ignoredFieldValues = {} as { [key: string]: any };
    for (const field of ignoreFields) {
      ignoredFieldValues[field] = this[field as keyof FsOperation];
      (this as any)[field] = null;
    }
    const hash = await this.hashCode();
    for (const field of ignoreFields) {
      (this as any)[field] = ignoredFieldValues[field];
    }
    return hash;
  }

  private async allFieldsHashCode(): Promise<string> {
    const s = this.serialize();
    const data = new TextEncoder().encode(s);
    const fullHash = new Uint8Array(await crypto.subtle.digest(OP_HASH_ALG, data));
    return uint8ArrayToBase64(fullHash.slice(0, OP_HASH_BYTES));
  }

  public equals(op: FsOperation) {
    return (
      this.randomStr === op.randomStr &&
      this.previousOperationHash === op.previousOperationHash &&
      this.operationType === op.operationType
    );
  }
}

export class MkDirFsOperation extends FsOperation {
  path: string;

  constructor(path: string, randomStr?: string) {
    super(FsOperationType.MK_DIR, randomStr);
    this.path = path;
  }

  serializeAttributes(): string {
    return `["${this.path || ''}"]`;
  }
}

export class RmFsOperation extends FsOperation {
  basePath: string;
  fileNames: string[];

  constructor(basePath: string, fileNames: string[], randomStr?: string) {
    super(FsOperationType.RM, randomStr);
    this.basePath = basePath;
    this.fileNames = fileNames;
  }

  serializeAttributes(): string {
    return `["${this.basePath || ''}",${JSON.stringify(this.fileNames)}]`;
  }
}

export class RenameFsOperation extends FsOperation {
  pathSrc: string;
  pathDest: string;

  constructor(pathSrc: string, pathDest: string, randomStr?: string) {
    super(FsOperationType.RENAME, randomStr);
    this.pathSrc = pathSrc;
    this.pathDest = pathDest;
  }

  serializeAttributes(): string {
    return `["${this.pathSrc || ''}","${this.pathDest || ''}"]`;
  }
}

export type FsOperationNameConflictMode = "REPLACE" | "RENAME" | "FIXED";

export class MvFsOperation extends FsOperation {
  pathSrc: string;
  fileNames: string[];
  pathDest: string;
  mode: FsOperationNameConflictMode;
  destFileNames: string[] | null;

  constructor(pathSrc: string, fileNames: string[], pathDest: string, mode: FsOperationNameConflictMode, destFileNames: string[] | null, randomStr?: string) {
    super(FsOperationType.MV, randomStr);
    this.pathSrc = pathSrc;
    this.fileNames = fileNames;
    this.pathDest = pathDest;
    this.mode = mode;
    this.destFileNames = destFileNames;
  }

  serializeAttributes(): string {
    return `["${this.pathSrc || ''}",${JSON.stringify(this.fileNames)},"${this.pathDest || ''}","${this.mode}",${JSON.stringify(this.destFileNames)}]`;
  }
}

export class CpFsOperation extends FsOperation {
  pathSrc: string;
  fileNames: string[];
  pathDest: string;
  mode: FsOperationNameConflictMode;
  destFileNames: string[] | null;

  constructor(pathSrc: string, fileNames: string[], pathDest: string, mode: FsOperationNameConflictMode, destFileNames: string[] | null, randomStr?: string) {
    super(FsOperationType.CP, randomStr);
    this.pathSrc = pathSrc;
    this.fileNames = fileNames;
    this.pathDest = pathDest;
    this.mode = mode;
    this.destFileNames = destFileNames;
  }

  serializeAttributes(): string {
    return `["${this.pathSrc || ''}",${JSON.stringify(this.fileNames)},"${this.pathDest || ''}","${this.mode}",${JSON.stringify(this.destFileNames)}]`;
  }
}

export class UploadStartFsOperation extends FsOperation {
  path: string;
  byteOffset: number;
  byteLength: number;
  mode: FsOperationNameConflictMode;

  constructor(path: string, byteOffset: number, byteLength: number, mode: FsOperationNameConflictMode, randomStr?: string) {
    super(FsOperationType.START_UPLOAD, randomStr);
    this.path = path;
    this.byteOffset = byteOffset;
    this.byteLength = byteLength;
    this.mode = mode;
  }

  serializeAttributes(): string {
    return `["${this.path || ''}",${this.byteOffset},${this.byteLength},"${this.mode}"]`;
  }
}

export class UploadFinishFsOperation extends FsOperation {
  uploadStartOperationHash: string;
  fileContentHash: string;

  constructor(uploadStartOperationHash: string, fileContentHash: string, randomStr?: string) {
    super(FsOperationType.FINISH_UPLOAD, randomStr);
    this.uploadStartOperationHash = uploadStartOperationHash;
    this.fileContentHash = fileContentHash;
  }

  serializeAttributes(): string {
    return `["${this.uploadStartOperationHash || ''}","${this.fileContentHash}"]`;
  }
}

export class DescriptionFsOperation extends FsOperation {
  description: string;

  constructor(description: string, randomStr?: string) {
    super(FsOperationType.DESCRIPTION, randomStr);
    this.description = description;
  }

  serializeAttributes(): string {
    return `["${this.description || ''}"]`;
  }
}
