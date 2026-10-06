import { Layers, RefreshCw, Lock, TriangleAlert } from "lucide-react";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useNavigate } from "react-router-dom";
import { useCloseCurrentDrive } from "@/hooks/use-close-drives";
import { useFilesStore } from "@/stores/files-store";
import { Button } from "../ui/button";
import { useRequestDriveDescription } from "@/hooks/use-dialogs";

/** What the files screen shows when the password of the open drive was wrong: say so, and what can be done. */
export function WrongPasswordFilesArea() {
    const { setDriveDescription, refresh } = useFilesStoreOps();
    const navigate = useNavigate();
    const setPasswordRetryFlag = useFilesStore((state) => state.setPasswordRetryFlag);
    const closeCurrentDrive = useCloseCurrentDrive();
    const requestDriveDescription = useRequestDriveDescription();
    const driveName = useFilesStore((state) => state.driveClient?.getDriveName());

    async function handleAddDescriptionClick() {
        const description = await requestDriveDescription({driveName: driveName!});
        if (description) {
            setDriveDescription(description)
                .then(() => {
                    refresh();
                });
        }
    }

    const handleCloseDriveClick = () => {
        closeCurrentDrive();
        navigate('/');
    }

    const handleTryAgainClick = () => {
        closeCurrentDrive();
        setPasswordRetryFlag(true);
    }

    return (
        <div className="absolute inset-x-0 bottom-0 top-26 flex items-center justify-center px-4 pb-44">
            <section role="alert" className="flex w-[min(560px,100%)] flex-col gap-[18px] rounded-2xl border border-sunny-line bg-white p-7 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                <div className="flex items-start gap-3.5">
                    <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-xl bg-[#fbe9e7] text-[#b3261e]">
                        <TriangleAlert className="size-[22px]" strokeWidth={2} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                        <h2 className="m-0 text-[22px] font-semibold leading-tight">Password is wrong</h2>
                        <p className="m-0 text-muted-foreground">This password doesn’t open <b className="font-semibold text-foreground">{driveName}</b>. Check it and try again.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleTryAgainClick} className="h-11 gap-2 rounded-[10px] px-[18px]">
                        <RefreshCw aria-hidden="true" className="size-4" strokeWidth={2.2} />Try again
                    </Button>
                    <Button onClick={handleCloseDriveClick} variant="outline" className="h-11 gap-2 rounded-[10px] border px-[18px]">
                        <Lock aria-hidden="true" className="size-4" strokeWidth={2.2} />Close drive
                    </Button>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-secondary p-3.5">
                    <Layers aria-hidden="true" className="mt-px size-[18px] flex-none text-[#3b3a34]" strokeWidth={2} />
                    <div className="flex flex-col items-start gap-1.5 text-[13px] leading-normal text-[#3b3a34]">
                        <span>You can still open the drive with this password, but it will show a different file space. To use it, add a description for that space.</span>
                        <button type="button" onClick={handleAddDescriptionClick} className="flex min-h-8 cursor-pointer items-center text-sm font-semibold text-foreground underline underline-offset-4">Add a description</button>
                    </div>
                </div>
            </section>
        </div>
    );
}
