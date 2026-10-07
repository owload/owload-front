import { LockOpen, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { DialogHead } from "./dialog-parts";
import { DialogCallbacks, RequestPasswordDialogProps } from "@/types/types";
import { useFsCloseDialogModal } from "@/hooks/use-dialogs";
import { PasswordInput } from "../drives/new-drive/form-parts";

export function RequestPasswordDialog({ driveName, inputCallback, dialogCloseCallback }: RequestPasswordDialogProps & DialogCallbacks) {
    const [password, setPassword] = useState("");
    const closeDialog = useFsCloseDialogModal();
    const fieldId = useId();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            dialogCloseCallback();
        } else {
            closeDialog().then(() => { inputCallback(password); });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="m-0 flex flex-col gap-4">
            <DialogHead icon={LockOpen} title="Enter password" subtitle={<>For the drive <b className="font-semibold text-foreground">{driveName}</b></>} />

            <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId} className="text-[13px] font-semibold">Password</label>
                <PasswordInput id={fieldId} label="password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus className="h-12 pr-[46px]" />
                <p className="m-0 flex items-start gap-1.5 text-xs leading-normal text-muted-foreground">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 size-[13px] flex-none" strokeWidth={2.2} />
                    <span>Checked on this device. The password is not sent to our servers.</span>
                </p>
            </div>

            <DialogFooter className="flex-row justify-end gap-2">
                <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={() => closeDialog()}>Cancel</Button>
                <Button type="submit" className="h-11 gap-2 rounded-[10px] px-5">
                    <LockOpen aria-hidden="true" className="size-4" strokeWidth={2.2} />
                    Open drive
                </Button>
            </DialogFooter>
        </form>
    );
}
