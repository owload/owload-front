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

// Returns true if candidate matches the auto-rename pattern for origName:
// "base (N)ext" where N ≥ 1 (e.g. "расчет (1).xlsx" for origName "расчет.xlsx").
function isAutoRename(origName: string, candidate: string): boolean {
  const dotIdx = origName.lastIndexOf('.');
  const ext = dotIdx >= 0 ? origName.slice(dotIdx) : '';
  const base = origName.slice(0, origName.length - ext.length);
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${esc(base)} \\(\\d+\\)${esc(ext)}$`).test(candidate);
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
        if (joinPath(cp.pathSrc, name) === currentPath || joinPath(cp.pathDest, effectiveDest) === currentPath) return true;
        // RENAME-mode CP: destFileNames is null; auto-generated name not stored.
        if (cp.mode === 'RENAME' && !cp.destFileNames) {
          const basename = currentPath.slice(currentPath.lastIndexOf('/') + 1);
          const dir = currentPath.slice(0, currentPath.lastIndexOf('/')) || '/';
          if (dir === cp.pathDest && isAutoRename(name, basename)) return true;
        }
        return false;
      });
    }
    default:
      return false;
  }
}

// Returns ops and version history for a file at currentPath.
// A version = an S3 byte range from a START_UPLOAD; MV/CP don't create new versions.
// nodeId (hash of current START_UPLOAD) is used to locate the original upload path,
// enabling path-chain tracing through RENAME-mode MV where auto-renamed dest is not stored.
export async function findFileHistory(
  ops: FsOperationWrapper[],
  actionLog: DriveActionLogEntry[],
  currentPath: string,
  nodeId?: string
): Promise<{ opsForPath: FsOperationWrapper[]; versions: FileVersionEntry[]; historyStartsHere: boolean }> {
  const byteToLog = buildByteToLogIndex(actionLog);
  interface PathSegment { path: string; startBytePos: number; endBytePos: number }

  // Phase 0: find the original upload path for nodeId so we can detect RENAME-mode MV
  // where destFileNames is null (auto-generated name not stored in the op).
  let startPath: string | null = null;
  if (nodeId) {
    for (const opWrapper of ops) {
      if (opWrapper.op?.operationType === FsOperationType.START_UPLOAD) {
        const hash = await opWrapper.op.hashCode();
        if (hash === nodeId) {
          startPath = (opWrapper.op as UploadStartFsOperation).path;
          break;
        }
      }
    }
  }

  // Phase 1: backward scan — build path segments following the RENAME/MV chain.
  // Segments: file was at `path` for ops in [startBytePos, endBytePos).
  const segments: PathSegment[] = [{ path: currentPath, startBytePos: 0, endBytePos: Infinity }];
  const boundaryOps = new Set<FsOperationWrapper>(); // ops that transition between segments
  let tracedPath = currentPath;
  // Overwrite points: REPLACE-mode MV brought our file to destPath, overwriting whatever was there.
  const overwritePoints: { destPath: string; beforePos: number }[] = [];

  for (let i = ops.length - 1; i >= 0; i--) {
    const opWrapper = ops[i];
    const op = opWrapper.op;
    if (!op) continue;

    let prevPath: string | null = null;

    if (op.operationType === FsOperationType.RENAME) {
      const r = op as RenameFsOperation;
      if (r.pathDest === tracedPath) prevPath = r.pathSrc;
    } else if (op.operationType === FsOperationType.MV) {
      const mv = op as MvFsOperation;
      for (let j = 0; j < mv.fileNames.length; j++) {
        // Normal case: destFileNames stores the actual dest name (FIXED mode or no conflict)
        const effectiveDest = mv.destFileNames?.[j] ?? mv.fileNames[j];
        if (joinPath(mv.pathDest, effectiveDest) === tracedPath) {
          prevPath = joinPath(mv.pathSrc, mv.fileNames[j]);
          if (mv.mode === 'REPLACE') {
            overwritePoints.push({ destPath: tracedPath, beforePos: opWrapper.startBytePos });
          }
          break;
        }
        // RENAME-mode MV: destFileNames is null; auto-generated name not stored.
        // Detect via startPath (nodeId's original upload path): if this MV moved startPath
        // to somewhere in mv.pathDest and tracedPath is a direct child of mv.pathDest,
        // this is almost certainly the MV that brought our file to tracedPath.
        if (mv.mode === 'RENAME' && !mv.destFileNames && startPath) {
          const srcPath = joinPath(mv.pathSrc, mv.fileNames[j]);
          if (srcPath === startPath) {
            const destPrefix = mv.pathDest === '/' ? '' : mv.pathDest;
            const afterDest = tracedPath.startsWith(destPrefix + '/') ? tracedPath.slice(destPrefix.length + 1) : null;
            if (afterDest && !afterDest.includes('/')) {
              prevPath = startPath;
              break;
            }
          }
        }
      }
    }

    if (prevPath !== null) {
      segments[0] = { ...segments[0], startBytePos: opWrapper.startBytePos };
      segments.unshift({ path: prevPath, startBytePos: 0, endBytePos: opWrapper.startBytePos });
      boundaryOps.add(opWrapper);
      tracedPath = prevPath;
    }
  }

  // Phase 1b: for each overwrite point, backward-trace the overwritten file's own path segments
  // (it may have been renamed/moved before being overwritten, so its START_UPLOAD path differs
  // from the dest path we recorded).
  const overwriteSegmentSets: PathSegment[][] = [];
  for (const ow of overwritePoints) {
    const owSegs: PathSegment[] = [{ path: ow.destPath, startBytePos: 0, endBytePos: ow.beforePos }];
    let owTracedPath = ow.destPath;
    for (let i = ops.length - 1; i >= 0; i--) {
      const owWrapper = ops[i];
      if (owWrapper.startBytePos >= ow.beforePos) continue;
      const owOp = owWrapper.op;
      if (!owOp) continue;
      let prevPath: string | null = null;
      if (owOp.operationType === FsOperationType.RENAME) {
        const r = owOp as RenameFsOperation;
        if (r.pathDest === owTracedPath) prevPath = r.pathSrc;
      } else if (owOp.operationType === FsOperationType.MV) {
        const mv = owOp as MvFsOperation;
        for (let j = 0; j < mv.fileNames.length; j++) {
          const effectiveDest = mv.destFileNames?.[j] ?? mv.fileNames[j];
          if (joinPath(mv.pathDest, effectiveDest) === owTracedPath) {
            prevPath = joinPath(mv.pathSrc, mv.fileNames[j]);
            break;
          }
        }
      }
      if (prevPath !== null) {
        owSegs[0] = { ...owSegs[0], startBytePos: owWrapper.startBytePos };
        owSegs.unshift({ path: prevPath, startBytePos: 0, endBytePos: owWrapper.startBytePos });
        owTracedPath = prevPath;
      }
    }
    overwriteSegmentSets.push(owSegs);
  }

  // Phase 2: forward pass — collect ops that fall within their path segment.
  const startHashToWrapper = new Map<string, FsOperationWrapper>();
  const opsForPath: FsOperationWrapper[] = [];
  let primaryStartFound = false;

  for (const opWrapper of ops) {
    const op = opWrapper.op;
    if (!op) continue;

    // Boundary ops (RENAME/MV that transition between segments) are always included —
    // opInvolvesCurrentPath would miss them when destFileNames is null (RENAME-mode MV).
    if (boundaryOps.has(opWrapper)) {
      opsForPath.push(opWrapper);
      continue;
    }

    // FINISH_UPLOAD has no path — match by its start hash
    if (op.operationType === FsOperationType.FINISH_UPLOAD) {
      const finOp = op as UploadFinishFsOperation;
      if (startHashToWrapper.has(finOp.uploadStartOperationHash)) {
        opsForPath.push(opWrapper);
      }
      continue;
    }

    const pos = opWrapper.startBytePos;
    const seg = segments.find(s => pos >= s.startBytePos && pos < s.endBytePos);

    if (op.operationType === FsOperationType.START_UPLOAD) {
      const startOp = op as UploadStartFsOperation;
      const primaryMatch = !!seg && startOp.path === seg.path;
      // Include uploads of files that were overwritten by the REPLACE-mode MV that brought
      // our file here. The overwritten file's path segments are pre-traced in Phase 1b.
      const overwriteMatch = !primaryMatch && overwriteSegmentSets.some(owSegs =>
        owSegs.some(owSeg =>
          startOp.path === owSeg.path && pos >= owSeg.startBytePos && pos < owSeg.endBytePos
        )
      );
      if (primaryMatch || overwriteMatch) {
        if (primaryMatch) primaryStartFound = true;
        const hash = await op.hashCode();
        startHashToWrapper.set(hash, opWrapper);
        opsForPath.push(opWrapper);
      }
      continue;
    }

    if (!seg) continue;
    if (opInvolvesCurrentPath(op, seg.path)) {
      opsForPath.push(opWrapper);
    }
  }

  // Phase 3: if no START_UPLOAD found via primary segments (file created by CP, never uploaded directly),
  // trace through the CP to the source file's latest START_UPLOAD before the copy.
  if (!primaryStartFound) {
    for (const cpWrapper of opsForPath) {
      if (cpWrapper.op?.operationType !== FsOperationType.CP) continue;
      const cp = cpWrapper.op as CpFsOperation;
      for (let j = 0; j < cp.fileNames.length; j++) {
        // Verify this CP slot corresponds to currentPath (dest matches, including auto-rename)
        const effectiveDest = cp.destFileNames?.[j] ?? cp.fileNames[j];
        const destPath = joinPath(cp.pathDest, effectiveDest);
        const basename = currentPath.slice(currentPath.lastIndexOf('/') + 1);
        const dir = currentPath.slice(0, currentPath.lastIndexOf('/')) || '/';
        const matches = destPath === currentPath ||
          (cp.mode === 'RENAME' && !cp.destFileNames && dir === cp.pathDest && isAutoRename(cp.fileNames[j], basename));
        if (!matches) continue;

        // Find the latest START_UPLOAD at the source path before this CP op
        const sourcePath = joinPath(cp.pathSrc, cp.fileNames[j]);
        let sourceStartWrapper: FsOperationWrapper | null = null;
        for (const w of ops) {
          if (w.startBytePos >= cpWrapper.startBytePos) break;
          if (w.op?.operationType === FsOperationType.START_UPLOAD &&
              (w.op as UploadStartFsOperation).path === sourcePath) {
            sourceStartWrapper = w;
          }
        }
        if (sourceStartWrapper) {
          const hash = await sourceStartWrapper.op!.hashCode();
          startHashToWrapper.set(hash, sourceStartWrapper);
          // Insert start/finish into opsForPath in chronological order
          const insertIdx = opsForPath.findIndex(w => w.startBytePos > sourceStartWrapper!.startBytePos);
          opsForPath.splice(insertIdx < 0 ? 0 : insertIdx, 0, sourceStartWrapper);
          const finishWrapper = ops.find(w =>
            w.startBytePos > sourceStartWrapper!.startBytePos &&
            w.op?.operationType === FsOperationType.FINISH_UPLOAD &&
            (w.op as UploadFinishFsOperation).uploadStartOperationHash === hash
          );
          if (finishWrapper) {
            const finIdx = opsForPath.findIndex(w => w.startBytePos > finishWrapper.startBytePos);
            opsForPath.splice(finIdx < 0 ? opsForPath.length : finIdx, 0, finishWrapper);
          }
        }
        break;
      }
      if (startHashToWrapper.size > 0) break; // found one CP source, stop
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

  return { opsForPath, versions, historyStartsHere: false };
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
