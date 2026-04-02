import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogCallbacks, RequestMvOperationModeDialogProps } from "@/types/types";
import { FsOperationNameConflictMode, OperationCancelledError } from "@/engine";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { truncate } from "@/lib/utils";
import { OperationCancellationReason } from "@/engine/service/drive-client";

export function RequestMvOperationMode({ commonFileNames, inputCallback, rejectCallback }: RequestMvOperationModeDialogProps & DialogCallbacks) {
    const closeDialog = useFsCloseDialogModal();

    const handleSubmitRename = (mode: FsOperationNameConflictMode) => {
        inputCallback(mode);
        closeDialog();
    };

    const handleStopClick = () => {
        closeDialog();
        rejectCallback(new OperationCancelledError(OperationCancellationReason.REQUEST_MODE_CANCELLATION));
    };

    return (
        <DialogHeader>
            <DialogTitle>Object with name already exists</DialogTitle>
            <DialogDescription>
                The destination directory already contains object with the name "{truncate(commonFileNames[0], 30)}"{commonFileNames.length === 2 && <> (and {commonFileNames.length - 1} more conficting object)</>}{commonFileNames.length > 2 && <> (and {commonFileNames.length - 1} more conficting objects)</>}.
            </DialogDescription>
            <DialogFooter className="mt-4 sm:justify-end">
                <Button className="py-5" variant={'default'} onClick={() => handleSubmitRename("RENAME")}>Keep both</Button>
                <Button className="py-5" variant={'black'} onClick={() => handleStopClick()}>Stop</Button>
                <Button className="py-5" variant={'default'} onClick={() => handleSubmitRename("REPLACE")}>Replace</Button>
            </DialogFooter>
        </DialogHeader>
    );
}
