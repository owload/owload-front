import { useEffect, useState } from "react";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { FileProperties } from "@/types/types";
import { MediaLoadingIndicator } from "./loading-indicator";
import { loadExtensionPhoto, prefetchExtensionPhoto } from "./extension-photo";

interface Props {
    fileToPreview: FileProperties;
    /** The photos on either side of this one, to be decoded in the background while this one is looked at. */
    neighbours?: FileProperties[];
    onLoadedCallback?: () => void;
}

/** A photo that the browser cannot show (HEIC): decoded by its extension and shown as a picture, like a JPEG. */
export function ExtensionPhotoPreview({ fileToPreview, neighbours = [], onLoadedCallback }: Props) {
    const { getFileData } = useFilesStoreOps();
    const [state, setState] = useState<{ forId: string; url?: string; failed?: boolean }>({ forId: fileToPreview.id });

    useEffect(() => {
        let aborted = false;
        setState({ forId: fileToPreview.id });
        loadExtensionPhoto(fileToPreview.id, fileToPreview.name, () => getFileData(fileToPreview))
            .then((url) => {
                if (aborted) return;
                setState({ forId: fileToPreview.id, url });
                onLoadedCallback?.();
                // the next and the previous photo are decoded while this one is looked at, so that paging does not wait
                for (const neighbour of neighbours) {
                    prefetchExtensionPhoto(neighbour.id, neighbour.name, () => getFileData(neighbour));
                }
            })
            .catch(() => { if (!aborted) setState({ forId: fileToPreview.id, failed: true }); });
        return () => { aborted = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileToPreview.id]);

    // between a change of file and the effect, the picture of the previous one must not be shown
    const current = state.forId === fileToPreview.id ? state : { forId: fileToPreview.id };
    if (current.failed) {
        return <div role="alert" className="rounded-lg bg-sunny-ink/90 px-4 py-2 text-white">This photo could not be shown. You can still download it.</div>;
    }
    if (!current.url) {
        return <MediaLoadingIndicator label="Decoding photo" />;
    }
    return <img src={current.url} alt="" draggable={false} className="m-auto max-h-full max-w-full select-none object-contain" />;
}
