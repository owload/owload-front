import { CloudUpload, X } from "lucide-react";
import { FileProgressCardTitle } from "./file-progress-card-title";
import { FileProgressItem } from "./file-progress-item";
import { useFilesStore } from "@/stores/files-store";
import { DrawerHeader, DrawerTitle, DrawerTrigger } from "../ui/drawer";
import { FileProgressCircle } from "./file-progress-circle";
import { useIsAllTransferFinished, useTotalTransferProgress } from "@/hooks/use-upload-progress";
import { useDeactivateMobileSelectMode } from "@/hooks/use-mobile-select-mode";
import { useUploadFile } from "@/hooks/use-upload-file";

export function FileProgressCard() {
    const uploadQueue = useFilesStore((state) => state.uploadQueue);
    const getTotalProgress = useTotalTransferProgress();
    const allFinished = useIsAllTransferFinished();
    const deactivateMobileSelectMode = useDeactivateMobileSelectMode();
    const uploadFile = useUploadFile();

    const handleUploadClick = () => {
        deactivateMobileSelectMode();
        uploadFile();
    };

    return (
        <div className="w-full sm:w-130 bg-white rounded-t-md h-full">
            <DrawerHeader className="p-0 m-0">
                <DrawerTitle className="p-0 m-0">
                    <FileProgressCardTitle progress={getTotalProgress()}>
                        <div className="inline-block pr-3">
                            <FileProgressCircle size={17} strokeWidth={3} emptyColor="#e5e7eb" />
                        </div>
                        {allFinished ? "Uploaded" : "Uploading"} {uploadQueue.length} {uploadQueue.length > 1 ? "files" : "file"}{allFinished ? "" : "..."}
                    </FileProgressCardTitle>
                </DrawerTitle>
            </DrawerHeader>
            <div className="rounded-md border-1 overflow-scroll max-h-[calc(80vh-44px)] pb-10 sm:max-h-full sm:absolute sm:top-11 sm:bottom-0 sm:inset-x-0 sm:pb-10">

                {uploadQueue.map(item => (
                    <FileProgressItem uploadQueueItem={item} key={item.uploadId} />
                ))}
                <button
                    type="button"
                    onClick={handleUploadClick}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Upload files"
                    className="fixed bottom-4 right-16 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:bg-primary"
                    style={{ width: 44, height: 44 }}
                >
                    <CloudUpload size={20} />
                </button>
                <DrawerTrigger>
                    <div
                        title="Close"
                        className="fixed bottom-4 right-4 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:bg-primary"
                        style={{ width: 44, height: 44 }}
                    >
                        <X size={20} />
                    </div>
                </DrawerTrigger>
            </div>
        </div>
    );
}