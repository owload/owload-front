import { OPS_SEPARATOR_BYTE_LENGTH } from "./splitting-ops-repository";
import { FsOperationWrapper } from "./ops-repository";
import { DriveActionLogEntry } from "./drive-action-log";
import { FsOperationType, UploadStartFsOperation, UploadFinishFsOperation } from "./fs-operation";
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
