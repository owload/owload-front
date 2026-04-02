import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useNavigate } from "react-router-dom";
import { useCloseCurrentDrive } from "@/hooks/use-close-drives";
import { useFilesStore } from "@/stores/files-store";
import { Button } from "../ui/button";
import { useRequestDriveDescription } from "@/hooks/use-dialogs";

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
        <div className='absolute min-h-115 inset-x-0 top-15 bottom-0 flex items-center justify-center px-1 pb-50 xl:pr-20'>
            <div>
                <center>
                    <div className="bg-[#f5d9d0] pt-15 2xs:px-3 lg:px-15 pb-5 rounded-2xl border-2 border-red-300 xl:w-150">
                        <p className='2xs:text-4xl lg:text-5xl text-gray-800 font-bold mb-3'>Password is wrong</p>
                        <div>
                            <Button onClick={handleTryAgainClick} variant={"secondary"} className="px-10">Try again</Button>
                            <Button onClick={handleCloseDriveClick} className="bg-black hover:bg-gray-900 text-white ml-2 px-10">Close drive</Button>
                        </div>
                        <p className="text-xs mt-8">You can access the drive with this password, but it will show different file space.
                            <br />
                            Just <span onClick={handleAddDescriptionClick} className="text-blue-700 cursor-pointer hover:underline">provide a description</span> for it.
                        </p>
                    </div>
                </center>
            </div>
        </div>
    );
}
