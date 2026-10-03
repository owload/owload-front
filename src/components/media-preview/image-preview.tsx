import { getPreviewFileName, PREVIEW_SIZES, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store"
import { FileProperties } from "@/types/types";
import { useEffect, useState } from "react"

interface ImagePreviewProps {
    fileToPreview: FileProperties,
    onLoadedCallback?: () => void
};

export function ImagePreview({ fileToPreview, onLoadedCallback }: ImagePreviewProps) {
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const { getFileData } = useFilesStoreOps();
    const [ready, setReady] = useState(false);
    const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();

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
        let aborted = {value: false};
        setImageDataUrl(undefined);
        setReady(false);

        const lowQualityFileName = getPreviewFileName(fileToPreview.id, PREVIEW_SIZES.MEDIA_PREVIEW);
        const lowQualityFileToPreview = fileObjects.find(f => f.name === lowQualityFileName);
        if (lowQualityFileToPreview && LOW_QUALITY_PREVIEW_ENABLED) {
            loadPreview(lowQualityFileToPreview, aborted)
                .then(() => {
                    if (aborted) return;
                    loadPreview(fileToPreview, aborted);
                });
        } else {
            loadPreview(fileToPreview, aborted);
        }

        return () => { aborted.value = true };
    }, [fileToPreview]);
    return <>
        {imageDataUrl &&
            <img src={imageDataUrl} onLoad={() => setReady(true)}
                className="max-w-full max-h-full m-auto select-none"
                style={{
                    display: ready ? "block" : "none"
                }}></img>
        }
    </>
}