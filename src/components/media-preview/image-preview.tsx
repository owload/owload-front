import { PREVIEW_SIZES, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { usePreviewFileFinder } from "./preview-source";
import { FileProperties } from "@/types/types";
import { useEffect, useState } from "react"
import { MediaLoadingIndicator } from "./loading-indicator";

interface ImagePreviewProps {
    fileToPreview: FileProperties,
    onLoadedCallback?: () => void
};

export function ImagePreview({ fileToPreview, onLoadedCallback }: ImagePreviewProps) {
    const findPreview = usePreviewFileFinder();
    const { getFileData } = useFilesStoreOps();
    const [ready, setReady] = useState(false);
    const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
    const [failed, setFailed] = useState(false);

    async function loadPreview(previewFile: FileProperties, aborted: {value: boolean}) {
        const data = await getFileData(previewFile);
        if (aborted.value) return;
        const f = new File([data], fileToPreview.name);
        const url = URL.createObjectURL(f);
        setImageDataUrl(url);
        if (onLoadedCallback) {
            onLoadedCallback();
        }
    }

    useEffect(() => {
        const LOW_QUALITY_PREVIEW_ENABLED = true;
        const aborted = {value: false};
        setImageDataUrl(undefined);
        setReady(false);
        setFailed(false);

        const lowQualityFileToPreview = findPreview(fileToPreview.id, PREVIEW_SIZES.MEDIA_PREVIEW);
        if (lowQualityFileToPreview && LOW_QUALITY_PREVIEW_ENABLED) {
            loadPreview(lowQualityFileToPreview, aborted)
                .then(() => {
                    // `aborted` is an object: testing the object itself is always true and the full image never loaded.
                    if (aborted.value) return;
                    return loadPreview(fileToPreview, aborted);
                })
                .catch(() => { if (!aborted.value) setFailed(true); });
        } else {
            loadPreview(fileToPreview, aborted).catch(() => { if (!aborted.value) setFailed(true); });
        }

        return () => { aborted.value = true };
    }, [fileToPreview]);
    return <>
        {!ready && !failed && <MediaLoadingIndicator label="Loading photo" />}
        {failed && !ready && <div role="alert" className="rounded-lg bg-sunny-ink/90 px-4 py-2 text-white">The photo could not be loaded</div>}
        {imageDataUrl &&
            <img src={imageDataUrl} onLoad={() => setReady(true)}
                className="max-w-full max-h-full m-auto select-none"
                style={{
                    display: ready ? "block" : "none"
                }}></img>
        }
    </>
}