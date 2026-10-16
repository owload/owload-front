import { useFilesStore } from "@/stores/files-store"
import { ImagePreview } from "./image-preview";
import { ExtensionPhotoPreview } from "./extension-photo-preview";
import { LivePhotoButton } from "./live-photo-button";
import { PreviewFinderProvider, type MediaViewerSource } from "./preview-source";
import { isExtensionPhoto } from "./extension-photo";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FsObjectType } from "@/engine";
import React, { useEffect } from "react";
import { VideoPreview } from "./video-preview";
import { SYSTEM_PREFIX, imageExtensions, playableVideoExtensions, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useNavigateDir } from "@/hooks/use-navigate-dir";
import { useIsMobile } from "@/hooks/use-mobile";

/** Shows the file that is open, with the arrows and swipes to the next and the previous. `source` is given where it is not the current folder that is paged through (the media section). */
export function MediaPreview({ source }: { source?: MediaViewerSource } = {}) {
    const { closeSelectedObject } = useFilesStoreOps();
    const isMobile = useIsMobile();
    const selectedFileObjects = useSelectedFileObjects();
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const navigateDir = useNavigateDir();
    const dragThreshold = 35;
    const closeThreshold = 90;

    const overlayDivRef = React.useRef<HTMLDivElement | null>(null);
    const touchAreaDivRef = React.useRef<HTMLDivElement | null>(null);
    const touchStartX = React.useRef<number | null>(null);
    const touchEndX = React.useRef<number | null>(null);
    const touchStartY = React.useRef<number | null>(null);
    const touchEndY = React.useRef<number | null>(null);

    const [dragX, setDragX] = React.useState(0);
    const [dragY, setDragY] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const [newLoaded, setNewLoaded] = React.useState(false);

    const fileToPreview = source ? source.files.find((f) => f.id === source.currentId) : selectedFileObjects[0];
    const list = source ? source.files : fileObjects;
    const goTo = (id: string) => (source ? source.onNavigate(id) : navigateDir(id));
    const close = () => (source ? source.onClose() : closeSelectedObject());
    // what the keys do is read from here, so that the one listener below always sees the file that is open now
    const keyActions = React.useRef<{ prev?: () => void; next?: () => void; close: () => void }>({ close: () => undefined });

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest?.('input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"]')) return;
            if (e.key === "Escape") { keyActions.current.close(); }
            else if (e.key === "ArrowRight" && keyActions.current.next) { e.preventDefault(); keyActions.current.next(); }
            else if (e.key === "ArrowLeft" && keyActions.current.prev) { e.preventDefault(); keyActions.current.prev(); }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    useEffect(() => {
        const touchListener = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };
        overlayDivRef.current?.addEventListener('touchmove', touchListener);
        return () => {
            overlayDivRef.current?.removeEventListener('touchstart', touchListener);
            overlayDivRef.current?.removeEventListener('touchmove', touchListener);
            overlayDivRef.current?.removeEventListener('touchend', touchListener);
        };
    }, [overlayDivRef.current]);

    useEffect(() => {
        touchAreaDivRef.current?.addEventListener('touchstart', handleTouchStart);
        touchAreaDivRef.current?.addEventListener('touchmove', handleTouchMove);
        touchAreaDivRef.current?.addEventListener('touchend', handleTouchEnd);
        return () => {
            touchAreaDivRef.current?.removeEventListener('touchstart', handleTouchStart);
            touchAreaDivRef.current?.removeEventListener('touchmove', handleTouchMove);
            touchAreaDivRef.current?.removeEventListener('touchend', handleTouchEnd);
        };
    }, [touchAreaDivRef.current, fileToPreview]);

    if (!fileToPreview) {
        return null;
    }

    function getNextFileObjectIndex(currentIndex: number, direction: 'next' | 'prev') {
        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0) nextIndex = list.length - 1;
        if (nextIndex >= list.length) nextIndex = 0;
        return nextIndex;
    }

    function getNextPreviewableFileObject(direction: 'next' | 'prev') {
        if (!fileToPreview || !list || list.length === 0) {
            return null;
        }
        let currentIndex = list.findIndex(f => f.id === fileToPreview.id);
        let nextFileObjectIndex = getNextFileObjectIndex(currentIndex, direction);
        let nextFileObject = list[nextFileObjectIndex];
        while (nextFileObject!.name.startsWith(SYSTEM_PREFIX)
            || nextFileObject!.type === FsObjectType.DIR
            || (!imageExtensions.includes(nextFileObject!.extension!) && !playableVideoExtensions.includes(nextFileObject!.extension!) && !isExtensionPhoto(nextFileObject!.name))) {
            nextFileObjectIndex = getNextFileObjectIndex(currentIndex, direction);
            nextFileObject = list[nextFileObjectIndex];
            currentIndex = nextFileObjectIndex;
        }
        if (nextFileObject === fileToPreview) {
            return null;
        }
        return nextFileObject;
    }

    const nextFileObject = getNextPreviewableFileObject('next');
    const prevFileObject = getNextPreviewableFileObject('prev');

    function handlePrevClick() {
        goTo(prevFileObject!.id);
    }

    function handleNextClick() {
        goTo(nextFileObject!.id);
    }

    function handleClose() {
        close();
    }

    keyActions.current = {
        prev: prevFileObject ? handlePrevClick : undefined,
        next: nextFileObject ? handleNextClick : undefined,
        close: handleClose,
    };


    function handleTouchStart(e: TouchEvent) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchEndX.current = e.touches[0].clientX;
        touchEndY.current = e.touches[0].clientY;
        setIsDragging(true);
    }

    function handleTouchMove(e: TouchEvent) {
        if (touchStartX.current !== null && touchStartY.current !== null) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            setDragX(currentX - touchStartX.current);
            setDragY(currentY - touchStartY.current);
            touchEndX.current = currentX;
            touchEndY.current = currentY;
        }
    }

    function handleTouchEnd() {
        setIsDragging(false);
        const deltaX = (touchEndX.current ?? 0) - (touchStartX.current ?? 0);
        const deltaY = (touchEndY.current ?? 0) - (touchStartY.current ?? 0);
        // swipe left/right for navigation
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > dragThreshold) {
            if (deltaX > 0 && prevFileObject) {
                setDragX(window.innerWidth);
                setDragY(0);
                handlePrevClick();
            } else if (deltaX < 0 && nextFileObject) {
                setDragX(-window.innerWidth);
                setDragY(0);
                handleNextClick();
            } else {
                setDragX(0);
                setDragY(0);
            }
            setNewLoaded(false);
        }
        // swipe up/down for close
        else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > closeThreshold) {
            setDragY(deltaY > 0 ? window.innerHeight : -window.innerHeight);
            setDragX(0);
            close();
        }
        else {
            setDragX(0);
            setDragY(0);
        }

        touchStartX.current = null;
        touchEndX.current = null;
        touchStartY.current = null;
        touchEndY.current = null;
    }

    function onLoadedCallback() {
        setNewLoaded(true);
        setDragX(0);
        setDragY(0);
    }

    return (
        <PreviewFinderProvider value={source?.findPreview ?? null}>
        <div
            className="fixed inset-0 z-150 flex items-center bg-sunny-ink/90"
            ref={overlayDivRef}
        >
            <div
                style={{ touchAction: "pan-y pan-x" }}
                className="flex-1 flex justify-center items-center h-full"
                ref={touchAreaDivRef}
            >
                <div
                    style={{
                        transform: Math.abs(dragX) >= Math.abs(dragY) ? `translateX(${dragX}px)` : `translateY(${dragY}px)`,
                        transition: isDragging || newLoaded ? "none" : "transform 0.35s cubic-bezier(.4,2,.6,1)",
                        willChange: "transform",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {imageExtensions.includes(fileToPreview.extension!) && <ImagePreview fileToPreview={fileToPreview} onLoadedCallback={onLoadedCallback} />}
                    {playableVideoExtensions.includes(fileToPreview.extension!) && <VideoPreview fileToPreview={fileToPreview} onLoadedCallback={onLoadedCallback} />}
                    {isExtensionPhoto(fileToPreview.name) && <ExtensionPhotoPreview fileToPreview={fileToPreview} neighbours={[nextFileObject, prevFileObject].filter((f): f is NonNullable<typeof f> => !!f && isExtensionPhoto(f.name))} onLoadedCallback={onLoadedCallback} />}
                </div>
            </div>

            {!isMobile && prevFileObject && (
                <button type="button" aria-label="Previous file" onClick={handlePrevClick} className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-sunny-ink/80 text-white outline-sunny-yellow hover:bg-sunny-ink focus-visible:outline-2">
                    <ChevronLeft className="size-6" strokeWidth={2.2} aria-hidden="true" />
                </button>
            )}
            {!isMobile && nextFileObject && (
                <button type="button" aria-label="Next file" onClick={handleNextClick} className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-sunny-ink/80 text-white outline-sunny-yellow hover:bg-sunny-ink focus-visible:outline-2">
                    <ChevronRight className="size-6" strokeWidth={2.2} aria-hidden="true" />
                </button>
            )}
            {fileToPreview.live && <LivePhotoButton key={fileToPreview.id} photo={fileToPreview} />}
            <button type="button" aria-label="Close preview" onClick={handleClose} className="absolute right-4 top-4 flex size-11 cursor-pointer items-center justify-center rounded-xl bg-sunny-ink text-sunny-yellow outline-sunny-yellow hover:bg-sunny-ink-raised focus-visible:outline-2">
                <X className="size-5" strokeWidth={2.4} aria-hidden="true" />
            </button>
        </div>
        </PreviewFinderProvider>
    );
}