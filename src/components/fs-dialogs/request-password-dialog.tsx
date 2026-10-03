import { useState } from "react";
import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { DialogCallbacks, RequestPasswordDialogProps } from "@/types/types";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";

export function RequestPasswordDialog({ driveName, inputCallback, dialogCloseCallback }: RequestPasswordDialogProps & DialogCallbacks) {
    const [password, setPassword] = useState("");
    const closeDialog = useFsCloseDialogModal();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            dialogCloseCallback();
        } else {
            closeDialog().then(() => { inputCallback(password); });
        }
    };

    return (
        <DialogHeader>
            <DialogTitle>Enter password</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogDescription>Input password for drive "{driveName}"</DialogDescription>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <DialogFooter className="mt-4 sm:justify-end">
                    <Button type="submit" className="py-5" variant={'default'}>Submit</Button>
                </DialogFooter>
            </form>
        </DialogHeader>
    );
}
