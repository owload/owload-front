import { useFilesStoreOps, getPreviewFileName, PREVIEW_SIZES } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store"
import { FileProperties } from "@/types/types";
import { ReactEventHandler, useEffect, useState } from "react";

interface VideoPreviewProps {
    fileToPreview: FileProperties,
    onLoadedCallback?: () => void
};

export function VideoPreview({ fileToPreview, onLoadedCallback }: VideoPreviewProps) {
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const { getFileData } = useFilesStoreOps();
    const [ready, setReady] = useState(false);
    const [playError, setPlayError] = useState(false);
    const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();

    const start = fileToPreview.byteOffset;
    const len = fileToPreview.byteLength!;


    async function loadPreview(previewFile: FileProperties, aborted: boolean) {
        const data = await getFileData(previewFile);
        if (aborted) return;
        const f = new File([data], fileToPreview.name);
        const url = URL.createObjectURL(f);
        setImageDataUrl(url);
        if (onLoadedCallback) {
            onLoadedCallback();
        }
    }

    useEffect(() => {
        const PREVIEW_ENABLED = true;

        let aborted = false;
        setImageDataUrl(undefined);
        setReady(false);

        const previewFileName = getPreviewFileName(fileToPreview.id, PREVIEW_SIZES.MEDIA_PREVIEW);
        const previewImg = fileObjects.find(f => f.name === previewFileName);
        if (previewImg && PREVIEW_ENABLED) {
            loadPreview(previewImg, aborted)
        }
        return () => { aborted = true };
    }, [fileToPreview]);

    const onCanPlayHandler: ReactEventHandler<HTMLVideoElement> = () => {
        setReady(true);
        // (e.target as HTMLVideoElement).play();
    }

    const onPlayErrorHandler: ReactEventHandler<HTMLVideoElement> = () => {
        setPlayError(true);
    }

    return <>
        {playError && <div className="fixed top-0">Media can not be played</div>}
        {!ready && <img className="max-w-full max-h-full m-auto select-none" src={imageDataUrl}></img>}
        <video className="max-w-full max-h-full m-auto select-none"
            playsInline
            muted
            autoPlay
            onCanPlayThrough={onCanPlayHandler}
            onCanPlay={onCanPlayHandler}
            onError={onPlayErrorHandler}
            style={{
                display: ready ? "block" : "block"
            }}
            preload="auto"
            controls src={`/videorequest/data/${start}/${len}`} />
    </>
}