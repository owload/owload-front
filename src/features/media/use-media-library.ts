import { useEffect, useMemo, useState } from "react";
import { useFilesStore } from "@/stores/files-store";
import { buildWriterIndex } from "@/engine/service/ops-log-analysis";
import { MediaLibrary, type LibrarySnapshot } from "./media-library";

const EMPTY: LibrarySnapshot = { items: [], total: 0, pending: 0 };

/**
 * The media of the open drive with the dates they were taken: shown at once from what this browser kept, and growing as the files that are
 * new to it are read. `ready` is false until the first answer, so that the page can show a skeleton instead of an empty list.
 */
export function useMediaLibrary(): { snapshot: LibrarySnapshot; ready: boolean } {
    const driveClient = useFilesStore((state) => state.driveClient);
    const filesInitialized = useFilesStore((state) => state.filesInitialized);
    // an upload that has finished brings a file the list does not have: the list is made again
    const finishedUploads = useFilesStore((state) => state.uploadQueue.filter((item) => item.status === "FINISHED").length);
    const [state, setState] = useState<{ snapshot: LibrarySnapshot; ready: boolean }>({ snapshot: EMPTY, ready: false });

    useEffect(() => {
        if (!driveClient || !filesInitialized) {
            setState({ snapshot: EMPTY, ready: false });
            return;
        }
        const library = new MediaLibrary({
            files: driveClient.listAllFiles(),
            read: (file, offset, length) => (length <= 0 ? Promise.resolve(new Uint8Array(0)) : driveClient.getFileData(file.byteOffset + offset, length, "", false)),
            loadCache: () => driveClient.loadMediaMetaCache(),
            saveCache: (value) => driveClient.saveMediaMetaCache(value),
            uploadTimes: async () => {
                await driveClient.refreshActionLog();
                const writers = await buildWriterIndex(driveClient.getOperationLog(), driveClient.getActionLog());
                return new Map([...writers].map(([id, writer]) => [id, writer.timestamp]));
            },
        });
        library.subscribe((snapshot) => setState({ snapshot, ready: true }));
        void library.start().then(() => setState({ snapshot: library.snapshot, ready: true }));
        return () => library.stop();
    }, [driveClient, filesInitialized, finishedUploads]);

    return useMemo(() => state, [state]);
}
