import { BufferedVideoPlayer } from "@/features/video-buffer/buffered-video-player";
import { isVideoBufferEnabled } from "@/features/video-buffer/flag";
import { getBufferingBackend } from "@/features/video-buffer/buffering-filesystem-backend";

const MIME_TYPES: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
};

function getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return MIME_TYPES[ext] ?? 'video/mp4';
}
import { FileProperties } from "@/types/types";
import { ReactEventHandler, useEffect, useRef, useState } from "react";
import { MediaLoadingIndicator } from "./loading-indicator";
import { PreviewThumbnail, usePreviewThumbnail } from "./use-preview-thumbnail";

interface VideoPreviewProps {
    fileToPreview: FileProperties,
    onLoadedCallback?: () => void
};

/**
 * The experimental buffered player when it is on (features/video-buffer), the browser's own controls otherwise. Either way nothing of a
 * player is drawn until there is a picture to show (the file's thumbnail or the first frame): until then an indicator says it is loading.
 */
export function VideoPreview(props: VideoPreviewProps) {
    const { fileToPreview, onLoadedCallback } = props;
    const thumbnail = usePreviewThumbnail(fileToPreview);
    const reportedFor = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (thumbnail.done && reportedFor.current !== fileToPreview.id) {
            reportedFor.current = fileToPreview.id;
            onLoadedCallback?.();
        }
    }, [thumbnail.done, fileToPreview.id, onLoadedCallback]);

    if (isVideoBufferEnabled() && getBufferingBackend()) {
        return <BufferedVideoPlayer key={fileToPreview.id} fileToPreview={fileToPreview} thumbnailUrl={thumbnail.url} />;
    }
    return <NativeVideoPreview key={fileToPreview.id} fileToPreview={fileToPreview} thumbnail={thumbnail} />;
}

function NativeVideoPreview({ fileToPreview, thumbnail }: { fileToPreview: FileProperties, thumbnail: PreviewThumbnail }) {
    const [ready, setReady] = useState(false);
    const [playError, setPlayError] = useState(false);

    const start = fileToPreview.byteOffset;
    const len = fileToPreview.byteLength!;

    const onCanPlayHandler: ReactEventHandler<HTMLVideoElement> = () => {
        setReady(true);
    }

    const onPlayErrorHandler: ReactEventHandler<HTMLVideoElement> = () => {
        setPlayError(true);
    }

    const showsSomething = ready || !!thumbnail.url;
    return <>
        {playError && <div className="fixed top-0">Media can not be played</div>}
        {!showsSomething && !playError && <MediaLoadingIndicator label="Loading video" />}
        {!ready && thumbnail.url && <img className="max-w-full max-h-full m-auto select-none" src={thumbnail.url}></img>}
        <video className="max-w-full max-h-full m-auto select-none"
            playsInline
            muted
            autoPlay
            onCanPlayThrough={onCanPlayHandler}
            onCanPlay={onCanPlayHandler}
            onError={onPlayErrorHandler}
            style={{ display: ready ? "block" : "none" }}
            preload="auto"
            controls src={`/videorequest/${encodeURIComponent(getMimeType(fileToPreview.name))}/${start}/${len}`} />
    </>
}
