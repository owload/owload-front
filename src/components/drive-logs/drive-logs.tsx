import { deleteApiCall, getApiCall } from "@/engine/api/api";
import { BLOCK_SIZE } from "@/engine/core/constants";
import { DescriptionFsOperation, FsOperationType, MkDirFsOperation, RmFsOperation, RenameFsOperation, UploadFinishFsOperation, UploadStartFsOperation } from "@/engine/service/fs-operation";
import { OPS_SEPARATOR_BYTE_LENGTH } from "@/engine/service/splitting-ops-repository";
import { FsOperationWrapper } from "@/engine/service/ops-repository";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DriveActionLogEntry } from "@/engine/service/drive-action-log";
import { useFilesStore } from "@/stores/files-store";
import { AbortContext } from "@/types/types";
import { useEffect, useMemo, useState } from "react";

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
    const saveOps = actionLog.filter((e) => e.action === 'SAVE_OP');
    return ops.map((op) => {
      const logEntry = saveOps.find(
        (e) => Number(e.attributes.start) + OPS_SEPARATOR_BYTE_LENGTH === op.startBytePos
      );
      return { ...op, logEntry };
    });
  }, [ops, actionLog]);

  async function runCleanup() {
    if (!driveClient || redundantRanges.length === 0) return;
    setConfirmOpen(false);
    setCleaning(true);
    const driveId = driveClient.getDriveId();
    try {
      for (const range of redundantRanges) {
        await deleteApiCall(`/data?driveId=${driveId}&start=${range.start}&end=${range.end}`);
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

      <div className="mb-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action log</div>
      {actionLog.length === 0 && (
        <div className="text-xs text-gray-400 mb-4">No entries</div>
      )}
      {actionLog.map((entry) => (
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
      ))}

      <div className="mb-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">FS operations</div>
      {enrichedOps.map((op) => {
        const unverified = logLoaded && !op.logEntry;
        return (
          <div
            key={op.startBytePos}
            className={`p-2 border-b text-sm ${unverified ? "bg-red-50 border-red-300" : "border-gray-300"}`}
          >
            <div className="flex flex-wrap gap-4 text-xs mb-1">
              <span className="text-gray-500">pos: {op.startBytePos}</span>
              <span className="text-gray-500">len: {op.byteLength}</span>
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
              <div>Set description: "{(op.op as DescriptionFsOperation).description}"</div>}
            {op.op?.operationType === FsOperationType.MK_DIR &&
              <div>mkdir {(op.op as MkDirFsOperation).path}</div>}
            {op.op?.operationType === FsOperationType.RM &&
              <div>rm [{(op.op as RmFsOperation).fileNames.join(", ")}] in {(op.op as RmFsOperation).basePath}</div>}
            {op.op?.operationType === FsOperationType.RENAME &&
              <div>rename {(op.op as RenameFsOperation).pathSrc} → {(op.op as RenameFsOperation).pathDest}</div>}
            {op.op?.operationType === FsOperationType.START_UPLOAD &&
              <div>upload start {(op.op as UploadStartFsOperation).path} ({formatBytes((op.op as UploadStartFsOperation).byteLength)}) @ {(op.op as UploadStartFsOperation).byteOffset}</div>}
            {op.op?.operationType === FsOperationType.FINISH_UPLOAD &&
              <div>upload finish → {(op.op as UploadFinishFsOperation).uploadStartOperationHash}</div>}
            {op.op?.operationType === FsOperationType.MV && <div>mv (op)</div>}
            {op.op?.operationType === FsOperationType.CP && <div>cp (op)</div>}
          </div>
        );
      })}
    </div>
  );
}
