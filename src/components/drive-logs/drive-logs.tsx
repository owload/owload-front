import { getApiCall } from "@/engine/api/api";
import { BLOCK_SIZE } from "@/engine/core/constants";
import { CpFsOperation, DescriptionFsOperation, FsOperationType, MkDirFsOperation, MvFsOperation, RmFsOperation, RenameFsOperation, UploadFinishFsOperation, UploadStartFsOperation } from "@/engine/service/fs-operation";
import { FsOperationWrapper } from "@/engine/service/ops-repository";
import { FsState, PerformOpMode } from "@/engine/service/fs-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DriveActionLogEntry } from "@/engine/service/drive-action-log";
import { PATH_SYMBOL_REAPLACEMENT, SYSTEM_PREFIX } from "@/hooks/use-files-store-ops";
import { saveFileToDisk } from "@/lib/utils";
import { buildByteToLogIndex, isRangeAllocated } from "@/engine/service/ops-log-analysis";
import { useFilesStore } from "@/stores/files-store";
import { AbortContext } from "@/types/types";
import { useEffect, useMemo, useState } from "react";

type EnrichedOp = FsOperationWrapper & { logEntry?: DriveActionLogEntry };

type UploadGroup = {
  type: 'upload';
  path: string;
  byteOffset: number;
  byteLength: number;
  thumbnailInfo: { size: number; fileId: string } | null;
  startOp: EnrichedOp;
  finishOp?: EnrichedOp;
  sortKey: number;
};

type OtherGroup = {
  type: 'other';
  op: EnrichedOp;
  sortKey: number;
};

type OpGroup = UploadGroup | OtherGroup;

function parseThumbnailInfo(path: string): { size: number; fileId: string } | null {
  const name = path.split('/').pop() ?? '';
  if (!name.startsWith(SYSTEM_PREFIX)) return null;
  const withoutPrefix = name.slice(SYSTEM_PREFIX.length); // "thumb_360_<uuid>"
  const parts = withoutPrefix.split('_');
  if (parts[0] !== 'thumb' || parts.length < 3) return null;
  return { size: parseInt(parts[1]), fileId: parts.slice(2).join('_') };
}

function formatFileName(name: string, resolveFileId: (id: string) => string | undefined): string {
  const info = parseThumbnailInfo(name);
  if (!info) return name;
  const nodeId = info.fileId.replaceAll(PATH_SYMBOL_REAPLACEMENT, '/');
  return `thumbnail ${info.size}px for ${resolveFileId(nodeId) ?? nodeId}`;
}


function UploadMeta({ startOp, finishOp, logLoaded }: { startOp: EnrichedOp; finishOp?: EnrichedOp; logLoaded: boolean }) {
  const userId = startOp.logEntry?.userId;
  const startedAt = startOp.logEntry?.timestamp;
  const finishedAt = finishOp?.logEntry?.timestamp;
  const unverified = logLoaded && (!startOp.logEntry || (finishOp && !finishOp.logEntry));

  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-0.5">
      {userId && <span>{userId}</span>}
      {startedAt && <span>started {new Date(startedAt).toLocaleString()}</span>}
      {finishOp
        ? finishedAt
          ? <span>finished {new Date(finishedAt).toLocaleString()}</span>
          : logLoaded && <span className="text-red-500">finish unverified</span>
        : <span className="text-amber-500">not finished</span>}
      {unverified && !userId && <span className="text-red-500">unverified</span>}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type BlockState = "effective" | "partial" | "redundant" | "free";

function computeBlocks(
  allocatedRanges: { start: number; end: number }[],
  effectiveRanges: { byteOffset: number; byteLength: number }[]
): BlockState[] {
  if (allocatedRanges.length === 0) return [];
  const maxEnd = Math.max(...allocatedRanges.map((r) => r.end));
  const blockCount = Math.ceil(maxEnd / BLOCK_SIZE);

  return Array.from({ length: blockCount }, (_, i) => {
    const blockStart = i * BLOCK_SIZE;
    const blockEnd = blockStart + BLOCK_SIZE;

    const isAllocated = allocatedRanges.some((r) => r.start < blockEnd && r.end > blockStart);
    if (!isAllocated) return "free";

    let effectiveBytes = 0;
    for (const r of effectiveRanges) {
      const s = Math.max(blockStart, r.byteOffset);
      const e = Math.min(blockEnd, r.byteOffset + r.byteLength);
      if (e > s) effectiveBytes += e - s;
    }

    if (effectiveBytes === 0) return "redundant";
    if (effectiveBytes >= BLOCK_SIZE) return "effective";
    return "partial";
  });
}

function computeRedundantRanges(blocks: BlockState[], maxEnd: number): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let rangeStart: number | null = null;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i] === "redundant") {
      if (rangeStart === null) rangeStart = i * BLOCK_SIZE;
    } else {
      if (rangeStart !== null) {
        ranges.push({ start: rangeStart, end: i * BLOCK_SIZE });
        rangeStart = null;
      }
    }
  }
  if (rangeStart !== null) {
    ranges.push({ start: rangeStart, end: maxEnd });
  }
  return ranges;
}

const BLOCK_COLORS: Record<BlockState, string> = {
  effective: "#22c55e",
  partial: "#f59e0b",
  redundant: "#ef4444",
  free: "#d1d5db",
};

function BlockBar({ blocks }: { blocks: BlockState[] }) {
  if (blocks.length === 0) return null;

  // Merge consecutive blocks of the same state into segments; skip free (unallocated) blocks
  const segments: { state: BlockState; count: number }[] = [];
  for (const b of blocks) {
    if (b === "free") continue;
    if (segments.length > 0 && segments[segments.length - 1].state === b) {
      segments[segments.length - 1].count++;
    } else {
      segments.push({ state: b, count: 1 });
    }
  }

  return (
    <div>
      <div className="flex h-8 rounded overflow-hidden w-full">
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              flex: seg.count,
              backgroundColor: BLOCK_COLORS[seg.state],
            }}
            title={`${seg.count} block(s) — ${seg.state}`}
          />
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-1">{blocks.length} blocks × 1 MB</div>
    </div>
  );
}

export function DriveLogs() {
  const driveClient = useFilesStore((state) => state.driveClient);
  const [ops, setOps] = useState<FsOperationWrapper[]>([]);
  const [actionLog, setActionLog] = useState<DriveActionLogEntry[]>([]);
  const [allocatedRanges, setAllocatedRanges] = useState<{ start: number; end: number }[] | null>(null);
  const [effectiveRanges, setEffectiveRanges] = useState<{ byteOffset: number; byteLength: number }[] | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logLoaded, setLogLoaded] = useState(false);
  const [downloadingOps, setDownloadingOps] = useState<Set<number>>(new Set());

  const downloadUploadGroup = async (group: UploadGroup) => {
    if (!driveClient) return;
    const key = group.startOp.startBytePos;
    setDownloadingOps(prev => new Set(prev).add(key));
    try {
      const contentHash = group.finishOp ? (group.finishOp.op as UploadFinishFsOperation).fileContentHash : '';
      const data = await driveClient.getFileData(group.byteOffset, group.byteLength, contentHash);
      saveFileToDisk(data, group.path.split('/').pop() ?? 'file');
    } finally {
      setDownloadingOps(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  useEffect(() => {
    if (!driveClient) return;
    const abortContext: AbortContext = { aborted: false };
    const driveId = driveClient.getDriveId();
    setLogLoaded(false);

    driveClient.getAllOperations().then((allOps) => {
      if (abortContext.aborted) return;
      setOps(allOps);
    });

    setActionLog(driveClient.getActionLog());
    driveClient.refreshActionLog().then((entries) => {
      if (abortContext.aborted) return;
      setActionLog(entries);
      setLogLoaded(true);
    }).catch(console.error);

    // /data/ranges is a diagnostic endpoint not covered by FilesystemBackend — intentionally a direct call
    getApiCall<{ start: number; end: number }[]>(`/data/ranges?driveId=${driveId}`).then((ranges) => {
      if (abortContext.aborted) return;
      setAllocatedRanges(ranges);
    });

    setEffectiveRanges(driveClient.getEffectiveRanges());

    return () => { abortContext.aborted = true; };
  }, [driveClient]);

  const blocks = useMemo(() => {
    if (!allocatedRanges || !effectiveRanges) return null;
    return computeBlocks(allocatedRanges, effectiveRanges);
  }, [allocatedRanges, effectiveRanges]);

  const redundantRanges = useMemo(() => {
    if (!blocks || !allocatedRanges || allocatedRanges.length === 0) return [];
    const maxEnd = Math.max(...allocatedRanges.map((r) => r.end));
    return computeRedundantRanges(blocks, maxEnd);
  }, [blocks, allocatedRanges]);

  const enrichedOps = useMemo(() => {
    // Assumes one POST /ops/{driveId} = one FsOperation: attributes.start points to the
    // leading OPS_SEPARATOR, so startBytePos = attributes.start + OPS_SEPARATOR_BYTE_LENGTH.
    // If batching is ever introduced this will silently stop matching — see epic 0004, task 0003.
    const byteToLog = buildByteToLogIndex(actionLog);
    return ops.map((op) => ({ ...op, logEntry: byteToLog.get(op.startBytePos) }));
  }, [ops, actionLog]);

  // hash → startBytePos for all START_UPLOAD ops (computed async)
  const [uploadStartHashMap, setUploadStartHashMap] = useState<Map<string, number>>(new Map());

  // startBytePos of ops that actually overwrote an existing file (REPLACE mode + file existed)
  const [overwriteSet, setOverwriteSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function computeHashes() {
      const map = new Map<string, number>();
      for (const op of enrichedOps) {
        if (op.op?.operationType === FsOperationType.START_UPLOAD) {
          const hash = await op.op.hashCode();
          if (cancelled) return;
          map.set(hash, op.startBytePos);
        }
      }
      if (!cancelled) setUploadStartHashMap(map);
    }
    computeHashes();
    return () => { cancelled = true; };
  }, [enrichedOps]);

  useEffect(() => {
    let cancelled = false;
    async function computeOverwrites() {
      const state = new FsState();
      const result = new Set<number>();
      const joinPath = (p1: string, p2: string) =>
        '/' + [...p1.split('/'), ...p2.split('/')].filter(Boolean).join('/');
      for (const wrapper of enrichedOps) {
        if (!wrapper.op) continue;
        const op = wrapper.op;
        if (op.operationType === FsOperationType.START_UPLOAD) {
          const uploadOp = op as UploadStartFsOperation;
          if (uploadOp.mode === "REPLACE" && state.getNodeByPath(uploadOp.path)) {
            result.add(wrapper.startBytePos);
          }
        } else if (op.operationType === FsOperationType.MV || op.operationType === FsOperationType.CP) {
          const mvOp = op as MvFsOperation | CpFsOperation;
          if (mvOp.mode === "REPLACE") {
            for (const fileName of mvOp.fileNames) {
              if (state.getNodeByPath(joinPath(mvOp.pathDest, fileName))) {
                result.add(wrapper.startBytePos);
                break;
              }
            }
          }
        }
        try {
          await state.performOp(op, PerformOpMode.DO_PERFORM);
        } catch { /* invalid op — state unchanged, continue */ }
        if (cancelled) return;
      }
      if (!cancelled) setOverwriteSet(result);
    }
    computeOverwrites();
    return () => { cancelled = true; };
  }, [enrichedOps]);

  const groupedOps = useMemo((): OpGroup[] => {
    const opByPos = new Map(enrichedOps.map((op) => [op.startBytePos, op]));
    const groupedStartPositions = new Set<number>();
    const groups: OpGroup[] = [];

    for (const op of enrichedOps) {
      if (op.op?.operationType === FsOperationType.FINISH_UPLOAD) {
        const hash = (op.op as UploadFinishFsOperation).uploadStartOperationHash;
        const startPos = uploadStartHashMap.get(hash);
        const startOpWrapper = startPos !== undefined ? opByPos.get(startPos) : undefined;
        if (startOpWrapper?.op?.operationType === FsOperationType.START_UPLOAD) {
          groupedStartPositions.add(startOpWrapper.startBytePos);
          const startOp = startOpWrapper.op as UploadStartFsOperation;
          groups.push({
            type: 'upload',
            path: startOp.path,
            byteOffset: startOp.byteOffset,
            byteLength: startOp.byteLength,
            thumbnailInfo: parseThumbnailInfo(startOp.path),
            startOp: startOpWrapper,
            finishOp: op,
            sortKey: op.startBytePos,
          });
        } else {
          groups.push({ type: 'other', op, sortKey: op.startBytePos });
        }
      } else if (op.op?.operationType !== FsOperationType.START_UPLOAD) {
        groups.push({ type: 'other', op, sortKey: op.startBytePos });
      }
    }

    // START_UPLOAD ops without a matching finish
    for (const op of enrichedOps) {
      if (op.op?.operationType === FsOperationType.START_UPLOAD && !groupedStartPositions.has(op.startBytePos)) {
        const startOp = op.op as UploadStartFsOperation;
        groups.push({
          type: 'upload',
          path: startOp.path,
          byteOffset: startOp.byteOffset,
          byteLength: startOp.byteLength,
          thumbnailInfo: parseThumbnailInfo(startOp.path),
          startOp: op,
          sortKey: op.startBytePos,
        });
      }
    }

    groups.sort((a, b) => a.sortKey - b.sortKey);
    return groups;
  }, [enrichedOps, uploadStartHashMap]);

  // nodeId (= upload op hash) → original file path, for resolving thumbnails of deleted files
  const nodeIdToPath = useMemo(() => {
    const opByPos = new Map(enrichedOps.map((op) => [op.startBytePos, op]));
    const map = new Map<string, string>();
    for (const [hash, pos] of uploadStartHashMap) {
      const op = opByPos.get(pos);
      if (op?.op?.operationType === FsOperationType.START_UPLOAD) {
        const startOp = op.op as UploadStartFsOperation;
        if (!parseThumbnailInfo(startOp.path)) {
          map.set(hash, startOp.path);
        }
      }
    }
    return map;
  }, [enrichedOps, uploadStartHashMap]);

  async function runCleanup() {
    if (!driveClient || redundantRanges.length === 0) return;
    setConfirmOpen(false);
    setCleaning(true);
    const driveId = driveClient.getDriveId();
    try {
      for (const range of redundantRanges) {
        await driveClient.deleteDataRange(range.start, range.end);
      }
      const ranges = await getApiCall<{ start: number; end: number }[]>(`/data/ranges?driveId=${driveId}`);
      setAllocatedRanges(ranges);
    } finally {
      setCleaning(false);
    }
  }

  const allocatedSize = allocatedRanges ? allocatedRanges.reduce((sum, r) => sum + (r.end - r.start), 0) : null;
  const effectiveSize = effectiveRanges ? effectiveRanges.reduce((sum, r) => sum + r.byteLength, 0) : null;

  const blockCounts = blocks
    ? {
        effective: blocks.filter((b) => b === "effective").length,
        partial: blocks.filter((b) => b === "partial").length,
        redundant: blocks.filter((b) => b === "redundant").length,
      }
    : null;

  return (
    <div className="absolute top-14 bottom-0 inset-x-0 overflow-y-auto p-4">
      <div className="mb-3 flex gap-8 text-sm">
        <div><strong>Allocated (S3):</strong> {allocatedSize === null ? "loading…" : formatBytes(allocatedSize)}</div>
        <div><strong>Effective (files):</strong> {effectiveSize === null ? "loading…" : formatBytes(effectiveSize)}</div>
        {allocatedSize !== null && effectiveSize !== null && (
          <div><strong>Redundant:</strong> {formatBytes(Math.max(0, allocatedSize - effectiveSize))}</div>
        )}
      </div>

      {blocks && (
        <div className="mb-4">
          <BlockBar blocks={blocks} />
          <div className="flex items-center gap-4 text-xs mt-2">
            <span style={{ color: BLOCK_COLORS.effective }}>■ Effective: {blockCounts!.effective}</span>
            <span style={{ color: BLOCK_COLORS.partial }}>■ Partial: {blockCounts!.partial}</span>
            <span style={{ color: BLOCK_COLORS.redundant }}>■ Redundant: {blockCounts!.redundant}</span>
            {blockCounts!.redundant > 0 && (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={cleaning}
                className="ml-2 px-2 py-0.5 text-xs border border-red-400 text-red-500 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {cleaning ? "Cleaning…" : "Clean up redundant"}
              </button>
            )}
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete redundant data?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>This will physically delete data from the server. This action is irreversible.</p>
                <p>After completion it will no longer be possible to:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>recover deleted files</li>
                  <li>restore previous versions of files</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 text-sm border rounded hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={runCleanup}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="fs-ops" className="mt-4">
        <TabsList>
          <TabsTrigger value="fs-ops">
            FS operations {enrichedOps.length > 0 && `(${enrichedOps.length})`}
          </TabsTrigger>
          <TabsTrigger value="action-log">
            Action log {actionLog.length > 0 && `(${actionLog.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="action-log">
          {actionLog.length === 0 ? (
            <div className="text-xs text-gray-400 py-4">No entries</div>
          ) : (
            actionLog.map((entry) => (
              <div key={entry.id} className="p-2 border-b border-gray-200 text-sm">
                <div className="flex gap-4 text-xs text-gray-500 mb-0.5">
                  <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  <span>{entry.userId}</span>
                </div>
                <div className="font-mono">
                  {entry.action}
                  {Object.keys(entry.attributes).length > 0 && (
                    <span className="text-gray-500 ml-2 text-xs">
                      {Object.entries(entry.attributes).map(([k, v]) => `${k}=${v}`).join(' ')}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="fs-ops">
          {[...groupedOps].reverse().map((group) => {
            if (group.type === 'upload') {
              const { thumbnailInfo, path, byteOffset, byteLength, startOp, finishOp } = group;
              let title: string;
              if (thumbnailInfo) {
                const nodeId = thumbnailInfo.fileId.replaceAll(PATH_SYMBOL_REAPLACEMENT, '/');
                const filePath = driveClient?.getFilePathById(nodeId) ?? nodeIdToPath.get(nodeId) ?? nodeId;
                title = `Upload thumbnail ${thumbnailInfo.size}px for ${filePath}`;
              } else {
                title = `Upload ${path}`;
              }
              const dataPresent = byteLength > 0 && allocatedRanges !== null
                ? isRangeAllocated(byteOffset, byteLength, allocatedRanges)
                : null;
              const unverified = logLoaded && (!startOp.logEntry || (finishOp && !finishOp.logEntry));
              const didOverwrite = overwriteSet.has(startOp.startBytePos);
              return (
                <div key={group.sortKey} className={`p-2 border-b text-sm ${unverified ? "bg-red-50 border-red-300" : "border-gray-300"}`}>
                  <div className="flex items-baseline gap-2">
                    <span>{title}</span>
                    <span className="text-gray-400 text-xs">{formatBytes(byteLength)}</span>
                    {didOverwrite && <span className="text-xs text-orange-600">overwrites existing</span>}
                    {byteLength > 0 && (dataPresent === null
                      ? <span className="text-xs text-gray-300">checking…</span>
                      : dataPresent
                        ? <span className="text-xs text-green-600">data on S3</span>
                        : <span className="text-xs text-red-500">data missing</span>)}
                    {dataPresent && !thumbnailInfo && finishOp && (
                      <button
                        onClick={() => downloadUploadGroup(group)}
                        disabled={downloadingOps.has(startOp.startBytePos)}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                      >
                        {downloadingOps.has(startOp.startBytePos) ? '…' : '↓'}
                      </button>
                    )}
                  </div>
                  <UploadMeta startOp={startOp} finishOp={finishOp} logLoaded={logLoaded} />
                </div>
              );
            }

            const { op } = group;
            const unverified = logLoaded && !op.logEntry;
            return (
              <div key={op.startBytePos} className={`p-2 border-b text-sm ${unverified ? "bg-red-50 border-red-300" : "border-gray-300"}`}>
                <div className="flex flex-wrap gap-4 text-xs mb-1">
                  <span className="text-gray-500">pos: {op.startBytePos}</span>
                  <span className={op.valid ? "text-gray-500" : "text-red-500"}>
                    {op.valid ? "valid" : `invalid: ${op.rejectionReason}`}
                  </span>
                  {op.logEntry ? (
                    <>
                      <span className="text-gray-400">{new Date(op.logEntry.timestamp).toLocaleString()}</span>
                      <span className="text-gray-400">{op.logEntry.userId}</span>
                    </>
                  ) : logLoaded && (
                    <span className="text-red-500 font-medium">unverified</span>
                  )}
                </div>
                {op.op?.operationType === FsOperationType.DESCRIPTION &&
                  <div>Set drive description: &ldquo;{(op.op as DescriptionFsOperation).description}&rdquo;</div>}
                {op.op?.operationType === FsOperationType.MK_DIR &&
                  <div>Create directory {(op.op as MkDirFsOperation).path}</div>}
                {op.op?.operationType === FsOperationType.RM && (() => {
                  const rm = op.op as RmFsOperation;
                  const resolve = (id: string) => driveClient?.getFilePathById(id) ?? nodeIdToPath.get(id);
                  const files = rm.fileNames.map((f) => formatFileName(f, resolve)).join(", ");
                  return <div>Delete {files} in {rm.basePath}</div>;
                })()}
                {op.op?.operationType === FsOperationType.RENAME && (() => {
                  const r = op.op as RenameFsOperation;
                  return <div>Rename {r.pathSrc} → {r.pathDest}</div>;
                })()}
                {op.op?.operationType === FsOperationType.MV && (() => {
                  const mv = op.op as MvFsOperation;
                  const resolve = (id: string) => driveClient?.getFilePathById(id) ?? nodeIdToPath.get(id);
                  const files = mv.fileNames.map((f, i) => {
                    const src = formatFileName(f, resolve);
                    const dest = mv.destFileNames ? formatFileName(mv.destFileNames[i], resolve) : null;
                    return dest && dest !== src ? `${src} → ${dest}` : src;
                  }).join(", ");
                  const didOverwrite = overwriteSet.has(op.startBytePos);
                  return <div className="flex items-baseline gap-2">
                    <span>Move {files} from {mv.pathSrc} to {mv.pathDest}</span>
                    {didOverwrite && <span className="text-xs text-orange-600">overwrites existing</span>}
                  </div>;
                })()}
                {op.op?.operationType === FsOperationType.CP && (() => {
                  const cp = op.op as CpFsOperation;
                  const resolve = (id: string) => driveClient?.getFilePathById(id) ?? nodeIdToPath.get(id);
                  const files = cp.fileNames.map((f, i) => {
                    const src = formatFileName(f, resolve);
                    const dest = cp.destFileNames ? formatFileName(cp.destFileNames[i], resolve) : null;
                    return dest && dest !== src ? `${src} → ${dest}` : src;
                  }).join(", ");
                  const didOverwrite = overwriteSet.has(op.startBytePos);
                  return <div className="flex items-baseline gap-2">
                    <span>Copy {files} from {cp.pathSrc} to {cp.pathDest}</span>
                    {didOverwrite && <span className="text-xs text-orange-600">overwrites existing</span>}
                  </div>;
                })()}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
