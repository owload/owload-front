import { useState } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { DialogCallbacks, RequestDescriptionDialogProps } from "@/types/types";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";

export function RequestDriveDescriptionDialog({ driveName, inputCallback }: RequestDescriptionDialogProps & DialogCallbacks) {
    const [description, seDescription] = useState("");
    const closeDialog = useFsCloseDialogModal();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        inputCallback(description);
        closeDialog();
    };

    return (
        <DialogHeader>
            <DialogTitle>Enter password</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogDescription>Input description for the drive "{driveName}"</DialogDescription>
                <Input value={description} onChange={(e) => seDescription(e.target.value)} />
                <DialogFooter className="mt-4 sm:justify-end">
                    <Button type="submit" className="py-5" variant={'default'}>Submit</Button>
                </DialogFooter>
            </form>
        </DialogHeader>
    );
}
