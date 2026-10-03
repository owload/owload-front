import { useEffect, useState } from "react";
import { DialogCallbacks, FilePropertiesDialogProps } from "@/types/types";
import { useFilesStore } from "@/stores/files-store";
import { getApiCall } from "@/engine/api/api";
import { buildByteToLogIndex, FileVersionEntry, findFileHistory, isRangeAllocated } from "@/engine/service/ops-log-analysis";
import { findThumbnailsFor } from "@/hooks/use-files-store-ops";
import { saveFileToDisk } from "@/lib/utils";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FsOperationType, UploadStartFsOperation, RmFsOperation, RenameFsOperation, MvFsOperation, CpFsOperation } from "@/engine/service/fs-operation";
import { FsOperationWrapper } from "@/engine/service/ops-repository";
import { DriveActionLogEntry } from "@/engine/service/drive-action-log";

type Props = FilePropertiesDialogProps & DialogCallbacks;

type Thumbnail = { size: number; byteOffset: number; byteLength: number };

type HistoryData = {
  opsForPath: FsOperationWrapper[];
  versions: FileVersionEntry[];
  actionLog: DriveActionLogEntry[];
  allocatedRanges: { start: number; end: number }[] | null;
  thumbsByVersion: Map<string, Thumbnail[]>;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function AllocationBadge({ byteOffset, byteLength, allocatedRanges }: { byteOffset: number; byteLength: number; allocatedRanges: { start: number; end: number }[] | null }) {
  if (byteLength === 0) return null;
  if (allocatedRanges === null) return <span className="text-xs text-gray-300">checking…</span>;
  const present = isRangeAllocated(byteOffset, byteLength, allocatedRanges);
  return present
    ? <span className="text-xs text-green-600">on S3</span>
    : <span className="text-xs text-red-500">missing</span>;
}

function VersionsTab({ data, onDownloadVersion, downloadingVersions }: {
  data: HistoryData;
  onDownloadVersion: (v: FileVersionEntry) => void;
  downloadingVersions: Set<string>;
}) {
  const { versions, allocatedRanges, thumbsByVersion } = data;

  let totalAllocated = 0;
  if (allocatedRanges) {
    for (const v of versions) {
      if (isRangeAllocated(v.byteOffset, v.byteLength, allocatedRanges)) {
        totalAllocated += v.byteLength;
      }
      for (const t of thumbsByVersion.get(v.createdOpHash) ?? []) {
        if (isRangeAllocated(t.byteOffset, t.byteLength, allocatedRanges)) {
          totalAllocated += t.byteLength;
        }
      }
    }
  }

  const currentVersion = versions[versions.length - 1];
  const currentVersionThumbs = thumbsByVersion.get(currentVersion?.createdOpHash ?? '') ?? [];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Version History</div>
        {versions.length === 0 ? (
          <div className="text-sm text-gray-400">No versions found in operation log.</div>
        ) : (
          <div className="border rounded divide-y text-sm">
            {versions.map((v, i) => (
              <div key={v.createdOpHash} className="flex items-center gap-3 px-3 py-2">
                <span className="text-gray-400 text-xs w-5">v{i + 1}</span>
                <div className="flex-1 min-w-0">
                  {v.writer ? (
                    <div className="flex flex-wrap gap-2">
                      <span className="font-medium truncate">{v.writer.userId}</span>
                      <span className="text-gray-400 text-xs">{new Date(v.writer.timestamp).toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <span className="text-gray-500 text-xs whitespace-nowrap">{formatBytes(v.byteLength)}</span>
                {!v.finishOp && <span className="text-xs text-amber-500">pending</span>}
                <AllocationBadge byteOffset={v.byteOffset} byteLength={v.byteLength} allocatedRanges={allocatedRanges} />
                {i === versions.length - 1 && <span className="text-xs text-blue-500">current</span>}
                {v.byteLength > 0 && allocatedRanges !== null && isRangeAllocated(v.byteOffset, v.byteLength, allocatedRanges) && v.finishOp && (
                  <button
                    onClick={() => onDownloadVersion(v)}
                    disabled={downloadingVersions.has(v.createdOpHash)}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                  >
                    {downloadingVersions.has(v.createdOpHash) ? '…' : '↓'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {currentVersionThumbs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Thumbnails (current version)</div>
          <div className="border rounded divide-y text-sm">
            {currentVersionThumbs.map(t => (
              <div key={t.size} className="flex items-center gap-3 px-3 py-2">
                <span className="text-gray-500 w-16">{t.size}px</span>
                <span className="flex-1 text-gray-500 text-xs">{formatBytes(t.byteLength)}</span>
                <AllocationBadge byteOffset={t.byteOffset} byteLength={t.byteLength} allocatedRanges={allocatedRanges} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-6 border-t pt-3">
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Current</div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{currentVersion ? formatBytes(currentVersion.byteLength) : '—'}</span>
            {currentVersion && <AllocationBadge byteOffset={currentVersion.byteOffset} byteLength={currentVersion.byteLength} allocatedRanges={allocatedRanges} />}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Total allocated</div>
          <span className="font-semibold text-sm">{allocatedRanges === null ? '…' : formatBytes(totalAllocated)}</span>
        </div>
      </div>
    </div>
  );
}

function OpEntry({ opWrapper, actionLog, logLoaded }: { opWrapper: FsOperationWrapper; actionLog: DriveActionLogEntry[]; logLoaded: boolean }) {
  const op = opWrapper.op;
  if (!op) return null;
  const byteToLog = buildByteToLogIndex(actionLog);
  const logEntry = byteToLog.get(opWrapper.startBytePos);
  const unverified = logLoaded && !logEntry;

  return (
    <div className={`px-3 py-2 border-b text-sm ${unverified ? "bg-red-50 border-red-300" : "border-gray-200"}`}>
      <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-1">
        {logEntry ? (
          <>
            <span>{new Date(logEntry.timestamp).toLocaleString()}</span>
            <span>{logEntry.userId}</span>
          </>
        ) : logLoaded && <span className="text-red-500 font-medium">unverified</span>}
      </div>
      <div className="text-sm">
        {op.operationType === FsOperationType.START_UPLOAD && (
          <span>Start upload — {(op as UploadStartFsOperation).path} ({formatBytes((op as UploadStartFsOperation).byteLength)})</span>
        )}
        {op.operationType === FsOperationType.FINISH_UPLOAD && (
          <span>Finish upload</span>
        )}
        {op.operationType === FsOperationType.RM && (() => {
          const rm = op as RmFsOperation;
          return <span>Delete {rm.fileNames.join(', ')} from {rm.basePath}</span>;
        })()}
        {op.operationType === FsOperationType.RENAME && (() => {
          const r = op as RenameFsOperation;
          return <span>Rename {r.pathSrc} → {r.pathDest}</span>;
        })()}
        {op.operationType === FsOperationType.MV && (() => {
          const mv = op as MvFsOperation;
          return <span>Move {mv.fileNames.join(', ')} from {mv.pathSrc} to {mv.pathDest}</span>;
        })()}
        {op.operationType === FsOperationType.CP && (() => {
          const cp = op as CpFsOperation;
          return <span>Copy {cp.fileNames.join(', ')} from {cp.pathSrc} to {cp.pathDest}</span>;
        })()}
      </div>
    </div>
  );
}

function OpLogTab({ data }: { data: HistoryData }) {
  const { opsForPath, actionLog } = data;
  const logLoaded = true;

  if (opsForPath.length === 0) {
    return <div className="text-sm text-gray-400 py-2">No operations found for this path.</div>;
  }

  return (
    <div className="border rounded overflow-hidden">
      {opsForPath.map(w => (
        <OpEntry key={w.startBytePos} opWrapper={w} actionLog={actionLog} logLoaded={logLoaded} />
      ))}
    </div>
  );
}

export function FilePropertiesDialog({ filePath, nodeId }: Props) {
  const driveClient = useFilesStore(state => state.driveClient);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [downloadingVersions, setDownloadingVersions] = useState<Set<string>>(new Set());

  const fileName = filePath.split('/').pop() ?? filePath;

  const downloadVersion = async (v: FileVersionEntry) => {
    if (!driveClient || !v.finishOp) return;
    const key = v.createdOpHash;
    setDownloadingVersions(prev => new Set(prev).add(key));
    try {
      const data = await driveClient.getFileData(v.byteOffset, v.byteLength, v.finishOp.fileContentHash);
      saveFileToDisk(data, v.op.path.split('/').pop() ?? fileName);
    } finally {
      setDownloadingVersions(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const parentPath = filePath.split('/').slice(0, -1).join('/') || '/';

  useEffect(() => {
    if (!driveClient) return;
    let aborted = false;
    const driveId = driveClient.getDriveId();

    (async () => {
      try {
        const [ops, actionLog, allocatedRanges] = await Promise.all([
          driveClient.getAllOperations(),
          driveClient.refreshActionLog().then(() => driveClient.getActionLog()),
          getApiCall<{ start: number; end: number }[]>(`/data/ranges?driveId=${driveId}`).catch(() => null as null),
        ]);
        if (aborted) return;

        const { opsForPath, versions } = await findFileHistory(ops, actionLog, filePath, nodeId);
        if (aborted) return;

        const thumbsByVersion = new Map<string, Thumbnail[]>();
        for (const v of versions) {
          thumbsByVersion.set(v.createdOpHash, findThumbnailsFor(driveClient, parentPath, v.createdOpHash));
        }
        // Also include current nodeId in case it differs (copied file)
        if (!thumbsByVersion.has(nodeId)) {
          thumbsByVersion.set(nodeId, findThumbnailsFor(driveClient, parentPath, nodeId));
        }

        setHistoryData({ opsForPath, versions, actionLog, allocatedRanges, thumbsByVersion });
        setLoading(false);
      } catch (e) {
        if (!aborted) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();

    return () => { aborted = true; };
  }, [driveClient, filePath, nodeId, parentPath]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate">{fileName}</DialogTitle>
      </DialogHeader>

      <div className="my-4 min-h-[200px] max-h-[60vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        )}
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        {!loading && !error && historyData && (
          <Tabs defaultValue="versions">
            <TabsList className="mb-4">
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="oplog">Op Log</TabsTrigger>
            </TabsList>
            <TabsContent value="versions">
              <VersionsTab data={historyData} onDownloadVersion={downloadVersion} downloadingVersions={downloadingVersions} />
            </TabsContent>
            <TabsContent value="oplog">
              <OpLogTab data={historyData} />
            </TabsContent>
          </Tabs>
        )}
      </div>

    </>
  );
}
