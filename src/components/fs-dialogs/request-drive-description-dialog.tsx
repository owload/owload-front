import { Layers } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { DialogCallbacks, RequestDescriptionDialogProps } from "@/types/types";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";

export function RequestDriveDescriptionDialog({ driveName, inputCallback }: RequestDescriptionDialogProps & DialogCallbacks) {
    const [description, setDescription] = useState("");
    const closeDialog = useFsCloseDialogModal();
    const fieldId = useId();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        inputCallback(description);
        closeDialog();
    };

    return (
        <form onSubmit={handleSubmit} className="m-0 flex flex-col gap-4">
            <div className="flex items-start gap-3.5 pr-8">
                <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Layers className="size-5" strokeWidth={2} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <DialogTitle className="text-xl font-semibold leading-tight">Add a description</DialogTitle>
                    <DialogDescription className="text-sm">For the drive <b className="font-semibold text-foreground">{driveName}</b></DialogDescription>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId} className="text-[13px] font-semibold">Description</label>
                <Input id={fieldId} value={description} onChange={(e) => setDescription(e.target.value)} autoComplete="off" autoFocus className="h-12" />
                <p className="m-0 text-xs leading-normal text-muted-foreground">Names the file space this password opens.</p>
            </div>

            <DialogFooter className="flex-row justify-end gap-2">
                <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={() => closeDialog()}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-[10px] px-5" disabled={!description.trim()}>Save</Button>
            </DialogFooter>
        </form>
    );
}
