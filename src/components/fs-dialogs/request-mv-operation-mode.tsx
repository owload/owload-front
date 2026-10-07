import { CopyPlus } from "lucide-react";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { Avatar, DialogHead, formatTs } from "./dialog-parts";
import { DialogCallbacks, NodeWriterInfo, RequestMvOperationModeDialogProps } from "@/types/types";
import { FsOperationNameConflictMode, OperationCancelledError } from "@/engine";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { OperationCancellationReason } from "@/engine/service/drive-client";
import { useUserInfo } from "@/auth-context-provider";

const DETAIL_THRESHOLD = 5;

function ExistingRow({ node, currentUserId }: { node: NodeWriterInfo; currentUserId: string }) {
  const isMine = node.userId === currentUserId;
  const label = isMine ? 'you' : node.userId;
  return (
    <div className="rounded-xl border border-sunny-line px-3.5 py-2.5 text-sm">
      <p className="m-0 mb-1 truncate font-medium text-foreground">{node.name}{node.isDir ? '/' : ''}</p>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="shrink-0 text-xs">Existing</span>
        {node.userId ? (
          <>
            <Avatar userId={node.userId} isMine={isMine} size={16} />
            <span className={`text-xs ${isMine ? '' : 'font-medium text-sunny-orange'}`}>
              {label}{node.timestamp && <> · {formatTs(node.timestamp)}</>}
            </span>
          </>
        ) : <span className="text-xs">—</span>}
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
    ? `“${commonFileNames[0]}” already exists`
    : `${commonFileNames.length} items already exist`;

  const showDetail = nodeInfos.length > 0 && nodeInfos.length <= DETAIL_THRESHOLD;
  const showSummary = nodeInfos.length > DETAIL_THRESHOLD;

  const otherIds = [...new Set(nodeInfos.filter(n => n.userId && n.userId !== currentUserId).map(n => n.userId!))];

  return (
    <div className="flex flex-col gap-4">
      <DialogHead icon={CopyPlus} tone={hasWarnings ? "warning" : "default"} title={title} subtitle="Keep both, or replace what is there?" />

      {showDetail && (
        <div className="flex max-h-52 flex-col gap-2 overflow-y-auto">
          {nodeInfos.map(n => <ExistingRow key={n.path} node={n} currentUserId={currentUserId} />)}
        </div>
      )}

      {showSummary && (
        <div className="flex flex-col gap-1.5 text-sm">
          {othersCount > 0 && (
            <p className="m-0 font-medium text-sunny-orange">
              {othersCount} existing item{othersCount !== 1 ? 's' : ''} uploaded by others: {otherIds.join(', ')}
            </p>
          )}
          {(nodeInfos.length - othersCount) > 0 && (
            <p className="m-0 text-muted-foreground">{nodeInfos.length - othersCount} existing item{(nodeInfos.length - othersCount) !== 1 ? 's' : ''} uploaded by you</p>
          )}
        </div>
      )}

      {pendingCount > 0 && (
        <p className="m-0 text-[13px] text-sunny-orange">
          {pendingCount} path{pendingCount !== 1 ? 's have' : ' has'} an unfinished upload.
        </p>
      )}

      <DialogFooter className="flex-row flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={handleStopClick}>Stop</Button>
        <Button type="button" variant={hasWarnings ? "destructive" : "outline"} className="h-11 rounded-[10px] px-4" onClick={() => handleSubmitRename("REPLACE")}>Replace</Button>
        <Button type="button" className="h-11 rounded-[10px] px-5" onClick={() => handleSubmitRename("RENAME")}>Keep both</Button>
      </DialogFooter>
    </div>
  );
}
