import { AbortContext } from "@/types/types";
import { getCachedUint8Value, setCachedValue } from "../backend/caches";
import { DriveId } from "../backend/drive-backend";
import { FilesystemBackend, SessionId } from "../backend/filesystem-backend";
import { UserId } from "../backend/user-backend";
import { createEncryptingStream, encrypt } from "../core/enc";
import { readBlobAsStream, readToUint8Array, uint8ArrayToBase64 } from "../core/stream-utils";
import { MkDirFsOperation, RmFsOperation, RenameFsOperation, CpFsOperation, UploadStartFsOperation, UploadFinishFsOperation, FsOperation, DescriptionFsOperation, MvFsOperation, FsOperationNameConflictMode } from "./fs-operation";
import { FsState, PerformOpMode, NameAlreadyUsed, TargetDoesNotExistError, FsObjectType, FsError } from "./fs-state";
import { FsTreeNode, FsTreeNodeId } from "./fs-tree-node";
import { OperationService } from "./operation-service";
import { FsOperationWrapper, RejectionReason } from "./ops-repository";

const FS_SNAPSHOT_CACHE = "FS_SNAPSHOT_CACHE_1";
const UPLOAD_CHUNK_LENGTH = 1 * 1024 * 1024;// ENCRYPTION_BLOCK_BYTE_LENGTH * 256 * 32;
const DOWNLOAD_CHUNK_LENGTH = UPLOAD_CHUNK_LENGTH;

export type ProgressInfo = {
  encrypted: number,
  transferred: number,
  total: number
};

export enum OperationCancellationReason {
  GENERIC_ABORT = "GENERIC_ABORT", // e.g. when user clicks "cancel" button in upload/download progress dialog
  REQUEST_MODE_CANCELLATION = "REQUEST_MODE_CANCELLATION" // e.g. when user cancels operation in "keep both/replace/stop" dialog
}

export class OperationCancelledError extends Error {
  public readonly reason: OperationCancellationReason;
  constructor(reason: OperationCancellationReason = OperationCancellationReason.GENERIC_ABORT) {
    super("Operation cancelled");
    this.name = "OperationCancelledError";
    this.reason = reason;
  }
};

export type ProgressCallback = (progressInfo: ProgressInfo) => void;
type SaveProgressCallback = (n: number) => void; // parameter represents number of bytes saved

export class DriveClient {
  private fsState = new FsState();
  private readonly userId: UserId;
  private readonly driveId: DriveId;
  private readonly driveName: string;
  private readonly operationService: OperationService;
  private readonly filesystemBackend: FilesystemBackend;
  private readonly privateKey;
  private readonly nonce;
  private readonly operationLog: FsOperationWrapper[] = [];
  private path = '/';

  constructor(userId: UserId,
    driveId: DriveId,
    driveName: string,
    operationService: OperationService,
    filesystemBackend: FilesystemBackend,
    privateKey: CryptoKey,
    nonce: Uint8Array) {
    this.driveId = driveId;
    this.driveName = driveName;
    this.userId = userId;
    this.operationService = operationService;
    this.filesystemBackend = filesystemBackend;
    this.privateKey = privateKey;
    this.nonce = nonce;
  }

  public async refresh(abortContext?: AbortContext) {
    const cachedFsState = await this.loadFsStateCache();
    let cachedPos = 0;
    let lastValidOpHash = "";
    if (cachedFsState) {
      this.fsState = cachedFsState.fsState;
      cachedPos = cachedFsState.pos;
      lastValidOpHash = cachedFsState.lastOperationHash;
    }
    console.log(`Loaded FS state cache at pos ${cachedPos}`);
    const newOps = await this.operationService.getOperations(cachedPos, lastValidOpHash);
    for (let opWrapper of newOps) {
      if (abortContext?.aborted) {
        return;
      }
      if (!opWrapper.valid) {
        continue;
      }
      lastValidOpHash = await opWrapper.op?.hashCode()!;
      try {
        await this.fsState.performOps([opWrapper.op!], PerformOpMode.DO_PERFORM);
      }
      catch (e) {
        opWrapper.valid = false;
        if (e instanceof NameAlreadyUsed) {
          opWrapper.rejectionReason = RejectionReason.FS_NAME_ALREADY_USED;
        } else {
          opWrapper.rejectionReason = RejectionReason.FS_OTHER_ERROR;
        }
      }
    }
    this.operationLog.push(...newOps);
    if (newOps.length > 0) {
      const lastOp = newOps[newOps.length - 1];
      await this.saveFsStateCache(lastOp.startBytePos + lastOp.byteLength, lastValidOpHash);
    }
  }

  public async getAllOperations(): Promise<FsOperationWrapper[]> {
    return this.operationService.getOperations(0);
  }

  public async setDescription(description: string) {
    await this.performOp(new DescriptionFsOperation(this.userId, description));
  }

  public getDescription() {
    return this.fsState.getDescription();
  }

  public getDriveId() {
    return this.driveId;
  }

  public getDriveName() {
    return this.driveName;
  }

  public cd(path: string) {
    path = this.getAbsolutePath(path);
    if (this.fsState.getNodeByPath(path) == null) {
      throw new TargetDoesNotExistError('Directory does not exist');
    }
    this.path = path;
  }

  public pwd(): string {
    return this.path;
  }

  pwdWithId(): { pathComponent: string; dirId: string; }[] {
    const pathComponents = this.path.split("/").filter(Boolean);
    const res = [];
    let curPath = "/";
    for (let p of pathComponents) {
      curPath += p + "/";
      let node = this.fsState.getNodeByPath(curPath);
      res.push({
        pathComponent: p,
        dirId: node!.id
      });
    }
    return res;
  }

  public getNode(path: string | undefined): FsTreeNode<FsObjectType> | null {
    return this.fsState.getNodeByPath(this.getAbsolutePath(path));
  }

  public cdByDirId(dirId: string) {
    const dirNode = this.fsState.getNodeById(dirId);
    if (!dirNode || dirNode.type !== FsObjectType.DIR) {
      throw new TargetDoesNotExistError('Directory does not exist');
    }
    this.path = this.fsState.getNodeAbsolutePath(dirNode);
  }

  public getNodeById(id: string): FsTreeNode<FsObjectType> | null {
    return this.fsState.getNodeById(id);
  }

  public ls(path: string | undefined): FsTreeNode<FsObjectType>[] {
    path = this.getAbsolutePath(path);
    const node = this.getNode(path);
    if (!node) {
      throw new TargetDoesNotExistError('Directory does not exist');
    }
    return node.childNodes;
  }

  public async mkdir(path: string): Promise<FsTreeNodeId> {
    path = this.getAbsolutePath(path);
    const opRes = await this.performOp(new MkDirFsOperation(this.userId, path));
    if (opRes.length !== 1) {
      throw new Error("Failed to create directory: unexpected number of changed nodes: " + opRes.length);
    }
    return opRes[0];
  }

  public async rm(fileNames: string[], basePath = ""): Promise<FsTreeNodeId[]> {
    basePath = this.getAbsolutePath(basePath);
    return this.performOp(new RmFsOperation(this.userId, basePath, [...fileNames].map(
      e => e.replace(/^\/+|\/+$/g, "") // Trim leading and trailing slashes
    )));
  }

  public async rename(pathSrc: string, pathDest: string): Promise<FsTreeNodeId> {
    pathSrc = this.getAbsolutePath(pathSrc);
    pathDest = this.getAbsolutePath(pathDest);
    const opRes = await this.performOp(new RenameFsOperation(this.userId, pathSrc, pathDest));
    if (opRes.length !== 1) {
      throw new Error("Failed to rename object: unexpected number of changed nodes: " + opRes.length);
    }
    return opRes[0];
  }

  public async mv(pathSrc: string, fileNames: string[], pathDest: string, mode: FsOperationNameConflictMode, destFileNames?: string[]): Promise<FsTreeNodeId[]> {
    pathSrc = this.getAbsolutePath(pathSrc);
    pathDest = this.getAbsolutePath(pathDest);
    return this.performOp(new MvFsOperation(this.userId, pathSrc, fileNames, pathDest, mode, destFileNames ? destFileNames : null));
  }

  public async cp(pathSrc: string, fileNames: string[], pathDest: string, mode: FsOperationNameConflictMode, destFileNames?: string[]): Promise<FsTreeNodeId[]> {
    pathSrc = this.getAbsolutePath(pathSrc);
    pathDest = this.getAbsolutePath(pathDest);
    return this.performOp(new CpFsOperation(this.userId, pathSrc, fileNames, pathDest, mode, destFileNames ? destFileNames : null));
  }

  public async uploadFile(file: File, directoryPath: string, mode: FsOperationNameConflictMode, uploadStartedCallback?: () => void, progressCallback?: ProgressCallback, abortSignal?: AbortSignal): Promise<FsTreeNodeId> {
    const fullPath = this.joinPath(directoryPath, file.name);
    if (abortSignal?.aborted) throw new OperationCancelledError();
    const sessionInfo = await this.filesystemBackend.startUploadSession(this.driveId, file.size);
    if (abortSignal?.aborted) throw new OperationCancelledError();
    const uploadStartOperation = new UploadStartFsOperation(this.userId, fullPath, sessionInfo.byteOffset, sessionInfo.byteLength, mode);
    const opRes = await this.performOp(uploadStartOperation);
    if (opRes.length !== 1) {
      throw new Error("Failed to upload file: unexpected number of changed nodes: " + opRes.length);
    }
    if (uploadStartedCallback) {
      uploadStartedCallback();
    }
    // upload file chunks
    if (abortSignal?.aborted) throw new OperationCancelledError();
    const fileContentStream = readBlobAsStream(file, UPLOAD_CHUNK_LENGTH);
    const [encryptProgressCallback, transferProgressCallback] = this.getProgressHandlers(progressCallback, file.size);
    const enc = createEncryptingStream(fileContentStream, this.privateKey, this.nonce, sessionInfo.byteOffset, UPLOAD_CHUNK_LENGTH, encryptProgressCallback);
    const ws = this.getSaveWritableStream(sessionInfo.sessionId, await uploadStartOperation.hashCode(), transferProgressCallback, abortSignal);
    await enc.pipeTo(ws, { signal: abortSignal });
    return opRes[0];
  }

  private async saveFsStateCache(pos: number = 0, lastOperationHash: string) {
    const cacheKey = await this.getFsStateCacheKey();
    const serializedState = JSON.stringify({
      pos,
      lastOperationHash,
      fsState: this.fsState.serialize()
    });
    const encryptedState = await encrypt(serializedState, this.privateKey, this.nonce);
    await setCachedValue<Uint8Array>(FS_SNAPSHOT_CACHE, cacheKey, encryptedState);
  }

  private async loadFsStateCache(): Promise<{ pos: number, lastOperationHash: string, fsState: FsState } | undefined> {
    const cacheKey = await this.getFsStateCacheKey();
    const cachedValue = await getCachedUint8Value(FS_SNAPSHOT_CACHE, cacheKey);
    if (cachedValue) {
      const decoder = new TextDecoder();
      const decryptedStateStr = decoder.decode(await encrypt(cachedValue, this.privateKey, this.nonce));
      const parsed = JSON.parse(decryptedStateStr);
      parsed.fsState = FsState.deserialize(parsed.fsState);
      return parsed;
    }
  }

  private async getFsStateCacheKey(): Promise<string> {
    const encryptedDriveId = await encrypt(this.driveId, this.privateKey, this.nonce);
    return uint8ArrayToBase64(encryptedDriveId);
  }

  private getProgressHandlers(progressCallback: ProgressCallback | undefined,
    totalByteSize: number): [(n: number) => void, (n: number) => void] {
    const progress: ProgressInfo = {
      encrypted: 0,
      transferred: 0,
      total: totalByteSize
    };
    const encryptProgressCallback = (encryptedBytesLength: number) => {
      progress.encrypted = Math.min(encryptedBytesLength, totalByteSize);
      if (progressCallback) {
        progressCallback(progress);
      }
    };
    const transferProgressCallback = (transferredBytesLength: number) => {
      progress.transferred = transferredBytesLength;
      if (progressCallback) {
        progressCallback(progress);
      }
    };
    return [encryptProgressCallback, transferProgressCallback];
  }

  public async getFileDataStream(byteOffset: number, byteLength: number, contentHash: string, cache = false, progressCallback?: ProgressCallback): Promise<ReadableStream<Uint8Array>> {
    contentHash; //todo
    const thisObj = this;
    const firstChunkLength = DOWNLOAD_CHUNK_LENGTH - byteOffset % DOWNLOAD_CHUNK_LENGTH;
    const [encryptProgressCallback, transferProgressCallback] = this.getProgressHandlers(progressCallback, byteLength);
    let bytesDownloaded = 0;
    const rs = new ReadableStream({
      async pull(controller) {
        let chunkLength = bytesDownloaded === 0 ? firstChunkLength : DOWNLOAD_CHUNK_LENGTH;
        if (bytesDownloaded + chunkLength > byteLength) {
          chunkLength = byteLength - bytesDownloaded;
        }
        const data = await thisObj.filesystemBackend.getDataBlock(
          thisObj.driveId,
          byteOffset + bytesDownloaded,
          chunkLength,
          cache);
        controller.enqueue(data);
        bytesDownloaded += data.byteLength;
        transferProgressCallback(bytesDownloaded)
        if (bytesDownloaded === byteLength) {
          controller.close();
        }
      }
    });
    return createEncryptingStream(rs, this.privateKey, this.nonce, byteOffset, DOWNLOAD_CHUNK_LENGTH, encryptProgressCallback);
  }

  public async getFileData(byteOffset: number, byteLength: number, contentHash: string, cache = false, progressCallback?: ProgressCallback): Promise<Uint8Array<ArrayBuffer>> {
    const dec = await this.getFileDataStream(byteOffset, byteLength, contentHash, cache, progressCallback);
    return readToUint8Array(dec, byteLength);
  }

  private getSaveWritableStream(sessionId: SessionId,
    uploadStartOperationHash: string,
    progressCallback: SaveProgressCallback,
    abortSignal?: AbortSignal
  ): WritableStream<Uint8Array> {
    let contentHash = "";
    const userId = this.userId;
    const saveDataBlockFunc = this.filesystemBackend.saveDataBlock.bind(this.filesystemBackend, sessionId);
    let uploadedBytesLength = 0;
    const finalizeOperationFunc = async (contentHash: string) => {
      await this.performOp(new UploadFinishFsOperation(userId, uploadStartOperationHash, contentHash));
    };
    return new WritableStream({
      async write(chunk: Uint8Array) {
        await saveDataBlockFunc(chunk, uploadedBytesLength, abortSignal);
        uploadedBytesLength += chunk.byteLength;
        if (progressCallback) {
          progressCallback(uploadedBytesLength);
        }
      },
      async close() {
        await finalizeOperationFunc(contentHash);
      }
    });
  }

  private async performOp(op: FsOperation) {
    await this.fsState.performOp(op, PerformOpMode.VALIDATE_ONLY); // if op is invalid, it will throw here
    const saveOpResult = await this.operationService.saveOperation(op);
    // operation may fail, but server will return other valid operations, e.g. made by other users
    const opsArray = saveOpResult.newOperations.filter(e => e.valid && e.op).map(e => e.op!);
    const performedOpIndex = opsArray.findIndex(e => e.hashCode === op.hashCode);
    const opResults = await this.fsState.performOps(opsArray, PerformOpMode.DO_PERFORM);
    if (!saveOpResult.ok) {
      throw new OperationFailedError('Operation failed');
    }
    return opResults[performedOpIndex];
  }

  public getAbsolutePath(path: string | undefined): string {
    if (path == null) {
      return this.path;
    }
    if (path.startsWith('/')) {
      return '/' + path.split('/').filter(Boolean).join('/');
    }
    return this.joinPath(this.path, path);
  }

  public joinPath(path1: string, path2: string): string {
    const pathComponents = path1.split('/');
    pathComponents.push(...path2.split('/'));
    return '/' + pathComponents.filter(Boolean).join('/');
  }
}


export class OperationFailedError extends FsError { }
