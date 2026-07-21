import { Button } from "../ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogCallbacks, ConfirmDeleteDialogProps, NodeWriterInfo } from "@/types/types";
import { OperationCancelledError } from "@/engine";
import { OperationCancellationReason } from "@/engine/service/drive-client";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { useUserInfo } from "@/auth-context-provider";

const DETAIL_THRESHOLD = 7;

function initials(userId: string): string {
  const name = userId.includes('@') ? userId.slice(0, userId.indexOf('@')) : userId;
  return name.slice(0, 2).toUpperCase();
}

function formatTs(ts: number) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function Avatar({ userId, isMine }: { userId: string; isMine: boolean }) {
  return (
    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${isMine ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
      {initials(userId)}
    </div>
  );
}

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

  const footer = (
    <DialogFooter className="mt-4 sm:justify-end">
      <Button variant="outline" onClick={handleCancel}>Cancel</Button>
      <Button variant={hasWarnings ? "destructive" : "default"} onClick={handleConfirm}>Delete</Button>
    </DialogFooter>
  );

  if (totalCount === 1) {
    const item = nodeInfos[0];
    const author = item ? authorLabel(item, currentUserId) : null;
    return (
      <DialogHeader>
        <DialogTitle>Delete "{item?.name ?? 'item'}"?</DialogTitle>
        {author && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Avatar userId={item!.userId!} isMine={author.isMine} />
            <span>
              Uploaded by <span className={author.isMine ? '' : 'text-amber-700 dark:text-amber-300 font-medium'}>{author.label}</span>
              {item!.timestamp && <> · {formatTs(item!.timestamp)}</>}
            </span>
          </div>
        )}
        {pendingPaths.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">An upload to this path is still in progress.</p>
        )}
        {footer}
      </DialogHeader>
    );
  }

  if (totalCount <= DETAIL_THRESHOLD) {
    return (
      <DialogHeader>
        <DialogTitle>Delete {totalCount} items?</DialogTitle>
        <div className="mt-2 border rounded-md overflow-hidden text-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-3 py-1.5 font-medium">Name</th>
                <th className="text-left px-3 py-1.5 font-medium">Uploaded by</th>
                <th className="text-left px-3 py-1.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {nodeInfos.map((n) => {
                const author = authorLabel(n, currentUserId);
                const isOther = author && !author.isMine;
                return (
                  <tr key={n.path}>
                    <td className="px-3 py-2 font-mono text-xs max-w-[130px] truncate text-foreground">
                      {n.name}{n.isDir ? '/' : ''}
                    </td>
                    <td className={`px-3 py-2 ${isOther ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                      {author ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar userId={n.userId!} isMine={!isOther} />
                          {author.label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap ${isOther ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                      {n.timestamp ? formatTs(n.timestamp) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pendingPaths.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
            {pendingPaths.length} path{pendingPaths.length !== 1 ? 's have' : ' has'} an unfinished upload.
          </p>
        )}
        {footer}
      </DialogHeader>
    );
  }

  const otherIds = [...new Set(nodeInfos.filter(n => n.userId && n.userId !== currentUserId).map(n => n.userId!))];
  const myCount = nodeInfos.filter(n => !n.userId || n.userId === currentUserId).length;

  return (
    <DialogHeader>
      <DialogTitle>Delete {totalCount} items?</DialogTitle>
      <div className="mt-2 space-y-1 text-sm">
        {othersCount > 0 && (
          <p className="text-amber-700 dark:text-amber-300">
            {othersCount} item{othersCount !== 1 ? 's' : ''} uploaded by others: {otherIds.join(', ')}
          </p>
        )}
        {myCount > 0 && (
          <p className="text-muted-foreground">{myCount} item{myCount !== 1 ? 's' : ''} uploaded by you</p>
        )}
        {pendingPaths.length > 0 && (
          <p className="text-amber-600 dark:text-amber-400">
            {pendingPaths.length} path{pendingPaths.length !== 1 ? 's have' : ' has'} an unfinished upload.
          </p>
        )}
      </div>
      {footer}
    </DialogHeader>
  );
}
