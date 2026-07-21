import { OPS_SEPARATOR_BYTE_LENGTH } from "./splitting-ops-repository";
import { FsOperationWrapper } from "./ops-repository";
import { DriveActionLogEntry } from "./drive-action-log";
import { FsOperation, FsOperationType, UploadStartFsOperation, UploadFinishFsOperation, MvFsOperation, CpFsOperation, RmFsOperation, RenameFsOperation } from "./fs-operation";
import { FsObjectType } from "./fs-state";
import { FsTreeNode } from "./fs-tree-node";

export const MAX_SCANNED_DESCENDANTS = 200;

// Maps (attributes.start + OPS_SEPARATOR_BYTE_LENGTH) → SAVE_OP action log entry for O(1) correlation.
export function buildByteToLogIndex(actionLog: DriveActionLogEntry[]): Map<number, DriveActionLogEntry> {
  const map = new Map<number, DriveActionLogEntry>();
  for (const entry of actionLog) {
    if (entry.action === 'SAVE_OP') {
      map.set(Number(entry.attributes.start) + OPS_SEPARATOR_BYTE_LENGTH, entry);
    }
  }
  return map;
}

// Maps nodeId (= hash of UploadStartFsOperation) → {userId, timestamp} of the last writer.
export async function buildWriterIndex(
  ops: FsOperationWrapper[],
  actionLog: DriveActionLogEntry[]
): Promise<Map<string, { userId: string; timestamp: number }>> {
  const byteToLog = buildByteToLogIndex(actionLog);
  const result = new Map<string, { userId: string; timestamp: number }>();
  for (const opWrapper of ops) {
    if (opWrapper.op?.operationType !== FsOperationType.START_UPLOAD) continue;
    const logEntry = byteToLog.get(opWrapper.startBytePos);
    if (!logEntry) continue;
    const hash = await opWrapper.op.hashCode();
    result.set(hash, { userId: logEntry.userId, timestamp: logEntry.timestamp });
  }
  return result;
}

// Returns paths (from the given set) that have a pending (unfinished) upload in the op log.
export async function findPendingUploads(
  ops: FsOperationWrapper[],
  actionLog: DriveActionLogEntry[],
  paths: Set<string>
): Promise<Map<string, { userId?: string; startedAt?: number }>> {
  const byteToLog = buildByteToLogIndex(actionLog);

  const startByHash = new Map<string, FsOperationWrapper>();
  for (const opWrapper of ops) {
    if (opWrapper.op?.operationType === FsOperationType.START_UPLOAD) {
      const hash = await opWrapper.op.hashCode();
      startByHash.set(hash, opWrapper);
    }
  }
  for (const opWrapper of ops) {
    if (opWrapper.op?.operationType === FsOperationType.FINISH_UPLOAD) {
      startByHash.delete((opWrapper.op as UploadFinishFsOperation).uploadStartOperationHash);
    }
  }

  const result = new Map<string, { userId?: string; startedAt?: number }>();
  for (const [, opWrapper] of startByHash) {
    const path = (opWrapper.op as UploadStartFsOperation).path;
    if (paths.has(path)) {
      const logEntry = byteToLog.get(opWrapper.startBytePos);
      result.set(path, { userId: logEntry?.userId, startedAt: logEntry?.timestamp });
    }
  }
  return result;
}

// Returns the slash-joined path of a node relative to the drive root (no leading slash).
export function getNodePath(node: FsTreeNode<FsObjectType>): string {
  const parts: string[] = [];
  let current: FsTreeNode<FsObjectType> | null = node;
  while (current && current.getParentNode() !== null) {
    parts.unshift(current.name);
    current = current.getParentNode();
  }
  return parts.join('/');
}

export function isRangeAllocated(byteOffset: number, byteLength: number, allocatedRanges: { start: number; end: number }[]): boolean {
  const end = byteOffset + byteLength;
  let covered = 0;
  for (const r of allocatedRanges) {
    const s = Math.max(byteOffset, r.start);
    const e = Math.min(end, r.end);
    if (e > s) covered += e - s;
  }
  return covered >= byteLength;
}

export interface FileVersionEntry {
  op: UploadStartFsOperation;
  finishOp?: UploadFinishFsOperation;
  createdOpHash: string;
  byteOffset: number;
  byteLength: number;
  writer: { userId: string; timestamp: number } | null;
}

function joinPath(dir: string, name: string): string {
  const parts = [...dir.split('/'), ...name.split('/')].filter(Boolean);
  return '/' + parts.join('/');
}

function isBoundaryOp(op: FsOperation, currentPath: string): boolean {
  if (op.operationType === FsOperationType.RENAME) {
    const r = op as RenameFsOperation;
    return r.pathDest === currentPath && r.pathSrc !== currentPath;
  }
  if (op.operationType === FsOperationType.MV) {
    const mv = op as MvFsOperation;
    return mv.fileNames.some((name, i) => {
      const effectiveDest = mv.destFileNames?.[i] ?? name;
      return joinPath(mv.pathDest, effectiveDest) === currentPath && joinPath(mv.pathSrc, name) !== currentPath;
    });
  }
  return false;
}

function opInvolvesCurrentPath(op: FsOperation, currentPath: string): boolean {
  switch (op.operationType) {
    case FsOperationType.RM: {
      const rm = op as RmFsOperation;
      return rm.fileNames.some(name => joinPath(rm.basePath, name) === currentPath);
    }
    case FsOperationType.RENAME: {
      const r = op as RenameFsOperation;
      return r.pathSrc === currentPath || r.pathDest === currentPath;
    }
    case FsOperationType.MV: {
      const mv = op as MvFsOperation;
      return mv.fileNames.some((name, i) => {
        const effectiveDest = mv.destFileNames?.[i] ?? name;
        return joinPath(mv.pathSrc, name) === currentPath || joinPath(mv.pathDest, effectiveDest) === currentPath;
      });
    }
    case FsOperationType.CP: {
      const cp = op as CpFsOperation;
      return cp.fileNames.some((name, i) => {
        const effectiveDest = cp.destFileNames?.[i] ?? name;
        return joinPath(cp.pathSrc, name) === currentPath || joinPath(cp.pathDest, effectiveDest) === currentPath;
      });
    }
    default:
      return false;
  }
}

// Returns ops and version history for a file at currentPath.
// Boundary: if currentPath was established via RENAME/MV, history starts there (historyStartsHere=true).
export async function findFileHistory(
  ops: FsOperationWrapper[],
  actionLog: DriveActionLogEntry[],
  currentPath: string
): Promise<{ opsForPath: FsOperationWrapper[]; versions: FileVersionEntry[]; historyStartsHere: boolean }> {
  const byteToLog = buildByteToLogIndex(actionLog);

  // Find latest boundary: RENAME/MV that established currentPath from a different path
  let boundaryBytePos = -1;
  let historyStartsHere = false;
  for (const opWrapper of ops) {
    if (opWrapper.op && isBoundaryOp(opWrapper.op, currentPath)) {
      boundaryBytePos = opWrapper.startBytePos;
      historyStartsHere = true;
    }
  }

  // Collect ops from boundary onwards that involve currentPath
  const startHashToWrapper = new Map<string, FsOperationWrapper>();
  const opsForPath: FsOperationWrapper[] = [];

  for (const opWrapper of ops) {
    if (boundaryBytePos >= 0 && opWrapper.startBytePos < boundaryBytePos) continue;
    const op = opWrapper.op;
    if (!op) continue;

    if (op.operationType === FsOperationType.START_UPLOAD) {
      if ((op as UploadStartFsOperation).path === currentPath) {
        const hash = await op.hashCode();
        startHashToWrapper.set(hash, opWrapper);
        opsForPath.push(opWrapper);
      }
    } else if (op.operationType === FsOperationType.FINISH_UPLOAD) {
      const finOp = op as UploadFinishFsOperation;
      if (startHashToWrapper.has(finOp.uploadStartOperationHash)) {
        opsForPath.push(opWrapper);
      }
    } else if (opInvolvesCurrentPath(op, currentPath)) {
      opsForPath.push(opWrapper);
    }
  }

  // Build versions in chronological order (Map preserves insertion order)
  const versions: FileVersionEntry[] = [];
  for (const [hash, startOpWrapper] of startHashToWrapper) {
    const startOp = startOpWrapper.op as UploadStartFsOperation;
    const logEntry = byteToLog.get(startOpWrapper.startBytePos);
    const finishOpWrapper = opsForPath.find(
      w => w.op?.operationType === FsOperationType.FINISH_UPLOAD &&
           (w.op as UploadFinishFsOperation).uploadStartOperationHash === hash
    );
    versions.push({
      op: startOp,
      finishOp: finishOpWrapper?.op as UploadFinishFsOperation | undefined,
      createdOpHash: hash,
      byteOffset: startOp.byteOffset,
      byteLength: startOp.byteLength,
      writer: logEntry ? { userId: logEntry.userId, timestamp: logEntry.timestamp } : null,
    });
  }

  return { opsForPath, versions, historyStartsHere };
}

// Recursively collects all nodes in the subtrees of roots.
// Stops at MAX_SCANNED_DESCENDANTS and sets truncated=true.
export function collectAffectedNodes(
  roots: FsTreeNode<FsObjectType>[]
): { nodes: FsTreeNode<FsObjectType>[]; truncated: boolean } {
  const result: FsTreeNode<FsObjectType>[] = [];
  let truncated = false;

  function traverse(node: FsTreeNode<FsObjectType>) {
    if (result.length >= MAX_SCANNED_DESCENDANTS) { truncated = true; return; }
    result.push(node);
    if (node.type === FsObjectType.DIR) {
      for (const child of node.childNodes) {
        traverse(child);
        if (truncated) return;
      }
    }
  }

  for (const root of roots) {
    if (!truncated) traverse(root);
  }
  return { nodes: result, truncated };
}
