import { Layers } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { DialogHead } from "./dialog-parts";
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
            <DialogHead icon={Layers} title="Add a description" subtitle={<>For the drive <b className="font-semibold text-foreground">{driveName}</b></>} />

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
