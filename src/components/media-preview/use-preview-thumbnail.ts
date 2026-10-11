import { useEffect, useState } from "react";
import { getPreviewFileName, PREVIEW_SIZES, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { FileProperties } from "@/types/types";

export interface PreviewThumbnail {
    /** The picture to show while the video itself is loading, once it has been fetched and decrypted. */
    url?: string;
    /** False while it is still being looked for or fetched; true when there is a picture, or there is none to wait for. */
    done: boolean;
}

/** The small picture the drive keeps next to a video, for showing something at once. Its object URL is released when it is no longer needed. */
export function usePreviewThumbnail(fileToPreview: FileProperties): PreviewThumbnail {
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const { getFileData } = useFilesStoreOps();
    const [state, setState] = useState<{ forId: string; url?: string; done: boolean }>({ forId: fileToPreview.id, done: false });

    useEffect(() => {
        let aborted = false;
        let objectUrl: string | undefined;
        setState({ forId: fileToPreview.id, done: false });
        const previewFileName = getPreviewFileName(fileToPreview.id, PREVIEW_SIZES.MEDIA_PREVIEW);
        const previewFile = fileObjects.find((f) => f.name === previewFileName);
        if (!previewFile) {
            setState({ forId: fileToPreview.id, done: true });
            return;
        }
        getFileData(previewFile)
            .then((data) => {
                if (aborted) return;
                objectUrl = URL.createObjectURL(new File([data], fileToPreview.name));
                setState({ forId: fileToPreview.id, url: objectUrl, done: true });
            })
            .catch(() => {
                if (!aborted) setState({ forId: fileToPreview.id, done: true });
            });
        return () => {
            aborted = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileToPreview.id]);

    // a render between a change of file and the effect must not show the previous file's picture
    return state.forId === fileToPreview.id ? { url: state.url, done: state.done } : { done: false };
}
