import { useFilesStore } from "@/stores/files-store";
import { EmptyFilesArea } from "./empty-files-area";
import { PopulatedFilesArea } from "./populated-files-area";
import { FilesAreaContextMenu } from "./files-area-context-menu";
import { WrongPasswordFilesArea } from "./wrong-password-files-area";
import { useGetCurrentDriveStats } from "@/hooks/use-get-current-drive-stats";
import { FilesAreaLoading } from "./files-area-loading";
import { SYSTEM_PREFIX } from "@/hooks/use-files-store-ops";
import { DebouncedSkeleton } from "../ui/debounced-skeleton";

export function FilesArea() {
    const getCurrentDriveStats = useGetCurrentDriveStats();
    const driveStats = getCurrentDriveStats();
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const filteredFileObjects = fileObjects.filter(file => !file.name.startsWith(SYSTEM_PREFIX));
    const filesInitialized = useFilesStore((state) => state.filesInitialized);
    window.onpopstate = function() {
        return false;
    }
    return (
        <DebouncedSkeleton
            contentInitialized={!!filesInitialized}
            initializedComponent={<>
                {!driveStats?.description
                    ? <WrongPasswordFilesArea />
                    : <FilesAreaContextMenu>
                        {filteredFileObjects.length > 0 ? <PopulatedFilesArea /> : <EmptyFilesArea />}
                    </FilesAreaContextMenu>
                }
            </>}
            skeletonComponent={<FilesAreaLoading />}
        />
    );
}
