import { deleteApiCall, getApiCall } from "@/engine/api/api";
import { BLOCK_SIZE } from "@/engine/core/constants";
import { DescriptionFsOperation, FsOperationType, MkDirFsOperation, RmFsOperation, RenameFsOperation, UploadFinishFsOperation, UploadStartFsOperation } from "@/engine/service/fs-operation";
import { FsOperationWrapper } from "@/engine/service/ops-repository";
import { useFilesStore } from "@/stores/files-store";
import { AbortContext } from "@/types/types";
import { useEffect, useMemo, useState } from "react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type BlockState = "effective" | "partial" | "wasted" | "free";

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

    if (effectiveBytes === 0) return "wasted";
    if (effectiveBytes >= BLOCK_SIZE) return "effective";
    return "partial";
  });
}

function computeWastedRanges(blocks: BlockState[], maxEnd: number): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let rangeStart: number | null = null;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i] === "wasted") {
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
  wasted: "#ef4444",
  free: "#d1d5db",
};

function BlockBar({ blocks }: { blocks: BlockState[] }) {
  if (blocks.length === 0) return null;

  // Compress runs of same state into segments, skipping free (unallocated) blocks
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
  const [allocatedRanges, setAllocatedRanges] = useState<{ start: number; end: number }[] | null>(null);
  const [effectiveRanges, setEffectiveRanges] = useState<{ byteOffset: number; byteLength: number }[] | null>(null);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    if (!driveClient) return;
    const abortContext: AbortContext = { aborted: false };
    const driveId = driveClient.getDriveId();

    driveClient.getAllOperations().then((allOps) => {
      if (abortContext.aborted) return;
      setOps(allOps);
    });

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

  const wastedRanges = useMemo(() => {
    if (!blocks || !allocatedRanges || allocatedRanges.length === 0) return [];
    const maxEnd = Math.max(...allocatedRanges.map((r) => r.end));
    return computeWastedRanges(blocks, maxEnd);
  }, [blocks, allocatedRanges]);

  async function handleCleanup() {
    if (!driveClient || wastedRanges.length === 0) return;
    setCleaning(true);
    const driveId = driveClient.getDriveId();
    try {
      for (const range of wastedRanges) {
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
        wasted: blocks.filter((b) => b === "wasted").length,
      }
    : null;

  return (
    <div className="absolute top-14 bottom-0 inset-x-0 overflow-y-auto p-4">
      <div className="mb-3 flex gap-8 text-sm">
        <div><strong>Allocated (S3):</strong> {allocatedSize === null ? "loading…" : formatBytes(allocatedSize)}</div>
        <div><strong>Effective (files):</strong> {effectiveSize === null ? "loading…" : formatBytes(effectiveSize)}</div>
        {allocatedSize !== null && effectiveSize !== null && (
          <div><strong>Wasted:</strong> {formatBytes(Math.max(0, allocatedSize - effectiveSize))}</div>
        )}
      </div>

      {blocks && (
        <div className="mb-4">
          <BlockBar blocks={blocks} />
          <div className="flex items-center gap-4 text-xs mt-2">
            <span style={{ color: BLOCK_COLORS.effective }}>■ Effective: {blockCounts!.effective}</span>
            <span style={{ color: BLOCK_COLORS.partial }}>■ Partial: {blockCounts!.partial}</span>
            <span style={{ color: BLOCK_COLORS.wasted }}>■ Wasted: {blockCounts!.wasted}</span>
            {blockCounts!.wasted > 0 && (
              <button
                onClick={handleCleanup}
                disabled={cleaning}
                className="ml-2 px-2 py-0.5 text-xs border border-red-400 text-red-500 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {cleaning ? "Cleaning…" : "Clean up wasted"}
              </button>
            )}
          </div>
        </div>
      )}

      {ops.map((op) => (
        <div key={op.startBytePos} className="p-2 border-b border-gray-300 text-sm">
          <div className="flex gap-4 text-xs text-gray-500 mb-1">
            <span>pos: {op.startBytePos}</span>
            <span>len: {op.byteLength}</span>
            <span>{op.valid ? "valid" : `invalid: ${op.rejectionReason}`}</span>
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
      ))}
    </div>
  );
}
