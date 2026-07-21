import { Button } from "../ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogCallbacks, NodeWriterInfo, RequestMvOperationModeDialogProps } from "@/types/types";
import { FsOperationNameConflictMode, OperationCancelledError } from "@/engine";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { OperationCancellationReason } from "@/engine/service/drive-client";
import { useUserInfo } from "@/auth-context-provider";

const DETAIL_THRESHOLD = 5;

function initials(userId: string): string {
  const name = userId.includes('@') ? userId.slice(0, userId.indexOf('@')) : userId;
  return name.slice(0, 2).toUpperCase();
}

function formatTs(ts: number) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function ExistingRow({ node, currentUserId }: { node: NodeWriterInfo; currentUserId: string }) {
  const isMine = node.userId === currentUserId;
  const label = isMine ? 'you' : node.userId;
  return (
    <div className="border rounded-md px-3 py-2 text-sm">
      <p className="font-mono text-xs text-foreground truncate mb-1">{node.name}{node.isDir ? '/' : ''}</p>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-xs text-muted-foreground shrink-0">Existing</span>
        {node.userId && (
          <>
            <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0 ${isMine ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
              {initials(node.userId)}
            </div>
            <span className={`text-xs ${isMine ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300'}`}>
              {label}{node.timestamp && <> · {formatTs(node.timestamp)}</>}
            </span>
          </>
        )}
        {!node.userId && <span className="text-xs">—</span>}
      </div>
    </div>
  );
}

export function RequestMvOperationMode({ commonFileNames, overwriteWarning, inputCallback, rejectCallback }: RequestMvOperationModeDialogProps & DialogCallbacks) {
  const closeDialog = useFsCloseDialogModal();
  const { id: currentUserId } = useUserInfo();

  const handleSubmitRename = (mode: FsOperationNameConflictMode) => {
    inputCallback(mode);
    closeDialog();
  };

  const handleStopClick = () => {
    closeDialog();
    rejectCallback(new OperationCancelledError(OperationCancellationReason.REQUEST_MODE_CANCELLATION));
  };

  const nodeInfos = overwriteWarning?.nodeInfos ?? [];
  const othersCount = nodeInfos.filter(n => n.userId && n.userId !== currentUserId).length;
  const pendingCount = overwriteWarning?.pendingPaths.length ?? 0;
  const hasWarnings = othersCount > 0 || pendingCount > 0;

  const title = commonFileNames.length === 1
    ? `"${commonFileNames[0]}" already exists in destination`
    : `${commonFileNames.length} items already exist in destination`;

  const showDetail = nodeInfos.length > 0 && nodeInfos.length <= DETAIL_THRESHOLD;
  const showSummary = nodeInfos.length > DETAIL_THRESHOLD;

  const otherIds = [...new Set(nodeInfos.filter(n => n.userId && n.userId !== currentUserId).map(n => n.userId!))];

  return (
    <DialogHeader>
      <DialogTitle>{title}</DialogTitle>

      {showDetail && (
        <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
          {nodeInfos.map(n => <ExistingRow key={n.path} node={n} currentUserId={currentUserId} />)}
        </div>
      )}

      {showSummary && (
        <div className="mt-2 space-y-1 text-sm">
          {othersCount > 0 && (
            <p className="text-amber-700 dark:text-amber-300">
              {othersCount} existing item{othersCount !== 1 ? 's' : ''} uploaded by others: {otherIds.join(', ')}
            </p>
          )}
          {(nodeInfos.length - othersCount) > 0 && (
            <p className="text-muted-foreground">{nodeInfos.length - othersCount} existing item{(nodeInfos.length - othersCount) !== 1 ? 's' : ''} uploaded by you</p>
          )}
        </div>
      )}

      {pendingCount > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
          {pendingCount} path{pendingCount !== 1 ? 's have' : ' has'} an unfinished upload.
        </p>
      )}

      <DialogFooter className="mt-4 sm:justify-end">
        <Button className="py-5" variant="default" onClick={() => handleSubmitRename("RENAME")}>Keep both</Button>
        <Button className="py-5" variant="black" onClick={handleStopClick}>Stop</Button>
        <Button className="py-5" variant={hasWarnings ? "destructive" : "default"} onClick={() => handleSubmitRename("REPLACE")}>Replace</Button>
      </DialogFooter>
    </DialogHeader>
  );
}
