import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { Avatar, DialogHead, formatTs } from "./dialog-parts";
import { DialogCallbacks, ConfirmDeleteDialogProps, NodeWriterInfo } from "@/types/types";
import { OperationCancelledError } from "@/engine";
import { OperationCancellationReason } from "@/engine/service/drive-client";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { useUserInfo } from "@/auth-context-provider";

const DETAIL_THRESHOLD = 7;

function authorLabel(node: NodeWriterInfo, currentUserId: string) {
  if (!node.userId) return null;
  const isMine = node.userId === currentUserId;
  return { label: isMine ? 'you' : node.userId, isMine };
}

export function ConfirmDeleteDialog({
  totalCount,
  overwriteWarning: { nodeInfos, pendingPaths },
  inputCallback,
  rejectCallback,
}: ConfirmDeleteDialogProps & DialogCallbacks) {
  const closeDialog = useFsCloseDialogModal();
  const { id: currentUserId } = useUserInfo();

  const handleConfirm = () => { inputCallback(undefined); closeDialog(); };
  const handleCancel = () => {
    closeDialog();
    rejectCallback(new OperationCancelledError(OperationCancellationReason.REQUEST_MODE_CANCELLATION));
  };

  const othersCount = nodeInfos.filter(n => n.userId && n.userId !== currentUserId).length;
  const hasWarnings = othersCount > 0 || pendingPaths.length > 0;

  const head = (title: string, subtitle?: React.ReactNode) => (
    <DialogHead icon={Trash2} tone={hasWarnings ? "danger" : "default"} title={title} subtitle={subtitle} />
  );

  const footer = (
    <DialogFooter className="flex-row justify-end gap-2">
      <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={handleCancel}>Cancel</Button>
      <Button type="button" variant={hasWarnings ? "destructive" : "default"} className="h-11 gap-2 rounded-[10px] px-5" onClick={handleConfirm}>
        <Trash2 className="size-4" strokeWidth={2.2} aria-hidden="true" />
        Delete
      </Button>
    </DialogFooter>
  );

  const pending = (
    pendingPaths.length > 0 && (
      <p className="m-0 text-[13px] text-sunny-orange">
        {totalCount === 1
          ? "An upload to this path is still in progress."
          : <>{pendingPaths.length} path{pendingPaths.length !== 1 ? 's have' : ' has'} an unfinished upload.</>}
      </p>
    )
  );

  if (totalCount === 1) {
    const item = nodeInfos[0];
    const author = item ? authorLabel(item, currentUserId) : null;
    return (
      <div className="flex flex-col gap-4">
        {head(`Delete “${item?.name ?? 'item'}”?`)}
        {author && (
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
            <Avatar userId={item!.userId!} isMine={author.isMine} />
            <span>
              Uploaded by <span className={author.isMine ? '' : 'font-semibold text-sunny-orange'}>{author.label}</span>
              {item!.timestamp && <> · {formatTs(item!.timestamp)}</>}
            </span>
          </div>
        )}
        {pending}
        {footer}
      </div>
    );
  }

  if (totalCount <= DETAIL_THRESHOLD) {
    return (
      <div className="flex flex-col gap-4">
        {head(`Delete ${totalCount} items?`)}
        <div className="overflow-hidden rounded-xl border border-sunny-line text-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sunny-line bg-secondary text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Name</th>
                <th className="px-3 py-2 text-left font-semibold">Uploaded by</th>
                <th className="px-3 py-2 text-left font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sunny-line">
              {nodeInfos.map((n) => {
                const author = authorLabel(n, currentUserId);
                const isOther = author && !author.isMine;
                return (
                  <tr key={n.path}>
                    <td className="max-w-[130px] truncate px-3 py-2.5 font-medium text-foreground">
                      {n.name}{n.isDir ? '/' : ''}
                    </td>
                    <td className={`px-3 py-2.5 ${isOther ? 'font-medium text-sunny-orange' : 'text-muted-foreground'}`}>
                      {author ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar userId={n.userId!} isMine={!isOther} />
                          {author.label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 ${isOther ? 'text-sunny-orange' : 'text-muted-foreground'}`}>
                      {n.timestamp ? formatTs(n.timestamp) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pending}
        {footer}
      </div>
    );
  }

  const otherIds = [...new Set(nodeInfos.filter(n => n.userId && n.userId !== currentUserId).map(n => n.userId!))];
  const myCount = nodeInfos.filter(n => !n.userId || n.userId === currentUserId).length;

  return (
    <div className="flex flex-col gap-4">
      {head(`Delete ${totalCount} items?`)}
      <div className="flex flex-col gap-1.5 text-sm">
        {othersCount > 0 && (
          <p className="m-0 font-medium text-sunny-orange">
            {othersCount} item{othersCount !== 1 ? 's' : ''} uploaded by others: {otherIds.join(', ')}
          </p>
        )}
        {myCount > 0 && (
          <p className="m-0 text-muted-foreground">{myCount} item{myCount !== 1 ? 's' : ''} uploaded by you</p>
        )}
        {pending}
      </div>
      {footer}
    </div>
  );
}
