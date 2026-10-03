import { cn, getExtension, truncate } from "@/lib/utils";
import { File } from "lucide-react";
import { Progress } from "../ui/progress";
import { UploadQueueItem } from "@/types/types";
import { useMediaBreakpoint } from "@/hooks/use-media-breakpoint";
import { calculateItemTransferProgressInfo } from "@/hooks/use-upload-progress";
import { ExtensionBadge } from "../files-area/extension-badge";
import { Button } from "../ui/button";
import { useCancelUpload } from "@/hooks/use-upload";



interface FileProgressItemProps {
    uploadQueueItem: UploadQueueItem;
}

export function FileProgressItem({ uploadQueueItem }: FileProgressItemProps) {
    const mediaBreakpoint = useMediaBreakpoint();
    const totalItemProgress = calculateItemTransferProgressInfo(uploadQueueItem);
    const cancelUpload = useCancelUpload();

    const totalSize = getReadableSize(uploadQueueItem.file.size);

    function getReadableSize(byteSize: number): { value: number, unit: 'B' | 'Kb' | 'Mb' | 'Gb' } {
        const sizeKb = 1024;
        const sizeMb = sizeKb * 1024;
        const sizeGb = sizeMb * 1024;
        if (byteSize >= sizeGb) {
            return {
                value: Math.floor(byteSize / sizeGb),
                unit: 'Gb'
            }
        } else if (byteSize >= sizeMb) {
            return {
                value: Math.floor(byteSize / sizeMb),
                unit: 'Mb'
            };
        } else if (byteSize >= sizeKb) {
            return {
                value: Math.floor(byteSize / sizeKb),
                unit: 'Kb'
            };
        } else {
            return {
                value: byteSize,
                unit: 'B'
            };
        }
    }

    const onCancelUpload = () => {
        cancelUpload(uploadQueueItem);
    }

    const encryptionPercent = Math.floor(totalItemProgress.encrypted / totalItemProgress.total * 100);
    const transferPercent = Math.floor(totalItemProgress.transferred / totalItemProgress.total * 100);

    let nameSybolsLimit = 44;
    if (mediaBreakpoint === "2xs" || mediaBreakpoint === "xs") {
        nameSybolsLimit = 25;
    }

    return (
        <div className="h-25 border-b-1 p-2 py-3">
            <table className="w-full">
                <tbody>

                    <tr>
                        <td className="relative w-8">
                            {!uploadQueueItem.thumbnailUrl && <div className={cn("py-2 pl-[8px] pr-1 rounded-md", uploadQueueItem.progressInfo['MAIN'].encrypted > 0 ? "bg-primary" : " bg-gray-100")}>
                                <File size={18} />
                            </div>}
                            {uploadQueueItem.thumbnailUrl && <div className="">
                                <img src={uploadQueueItem.thumbnailUrl} alt="file preview" className="top-0 left-0 w-8 h-8 rounded-md border-grey-100 border-1" />
                            </div>}
                            <ExtensionBadge extension={getExtension(uploadQueueItem.file.name)} className="absolute top-0 right-0" size="small" />
                        </td>
                        <td colSpan={2} className="pl-1 font-noto text-sm font-semibold">{truncate(uploadQueueItem.file.name, nameSybolsLimit)}</td>
                        <td colSpan={1} className="font-noto text-sm font-semibold w-18">
                            {(uploadQueueItem.status === "QUEUED" || uploadQueueItem.status === "PROGRESS") &&
                                <Button className="bg-[#4969d3] hover:bg-[#305be7] h-auto w-fit text-white px-2 py-0.5 rounded-sm text-[12px]" onClick={onCancelUpload}>
                                    Cancel
                                </Button>
                            }
                            {uploadQueueItem.status === "FINISHED" &&
                                <div className="bg-[#00755E] w-fit text-white px-2 py-0.5 rounded-sm text-[12px]">ready</div>
                            }
                            {uploadQueueItem.status === "CANCELLED" &&
                                <div className="bg-[#A2A2A2] w-fit text-white px-2 py-0.5 rounded-sm text-[12px]">cancelled</div>
                            }
                            {uploadQueueItem.status === "ERROR" &&
                                <div className="bg-[#EB5757] w-fit text-white px-2 py-0.5 rounded-sm text-[12px]">error</div>
                            }
                        </td>
                        <td colSpan={1} className="w-10 font-noto text-sm font-semibold text-right">{totalSize.value}{totalSize.unit}</td>
                    </tr>
                    <tr>
                        <td colSpan={3} className="w-20000 pr-2">
                            <Progress value={encryptionPercent} />
                        </td>
                        <td className="text-sm text-gray-600 pr-3">encrypt</td>
                        <td className="font-noto text-sm font-semibold text-right">{encryptionPercent}%</td>
                    </tr>
                    <tr>
                        <td colSpan={3} className="pr-2 transition">
                            <Progress value={transferPercent} />
                        </td>
                        <td className="text-sm text-gray-600">upload</td>
                        <td className="font-noto text-sm font-semibold text-right">{transferPercent}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}