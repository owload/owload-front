import { useFilesStore } from "@/stores/files-store"
import { ImagePreview } from "./image-preview";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FsObjectType } from "@/engine";
import React, { useEffect } from "react";
import { VideoPreview } from "./video-preview";
import { SYSTEM_PREFIX, openableExtensions, imageExtensions, playableVideoExtensions, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useNavigateDir } from "@/hooks/use-navigate-dir";
import { useIsMobile } from "@/hooks/use-mobile";

export function MediaPreview() {
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

    const fileToPreview = selectedFileObjects[0];

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

    if (!selectedFileObjects || selectedFileObjects.length === 0) {
        return null;
    }

    function getNextFileObjectIndex(currentIndex: number, direction: 'next' | 'prev') {
        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0) nextIndex = fileObjects.length - 1;
        if (nextIndex >= fileObjects.length) nextIndex = 0;
        return nextIndex;
    }

    function getNextPreviewableFileObject(direction: 'next' | 'prev') {
        if (!fileToPreview || !fileObjects || fileObjects.length === 0) {
            return null;
        }
        let currentIndex = fileObjects.findIndex(f => f.id === fileToPreview.id);
        let nextFileObjectIndex = getNextFileObjectIndex(currentIndex, direction);
        let nextFileObject = fileObjects[nextFileObjectIndex];
        while (nextFileObject!.name.startsWith(SYSTEM_PREFIX)
            || nextFileObject!.type === FsObjectType.DIR
            || !openableExtensions.includes(nextFileObject!.extension!)) {
            nextFileObjectIndex = getNextFileObjectIndex(currentIndex, direction);
            nextFileObject = fileObjects[nextFileObjectIndex];
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
        navigateDir(prevFileObject!.id);
    }

    function handleNextClick() {
        navigateDir(nextFileObject!.id);
    }

    function handleClose() {
        closeSelectedObject();
    }


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
            closeSelectedObject();
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
        <div
            className="fixed flex items-center z-150 inset-0 bg-black/80"
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
                </div>
            </div>

            {!isMobile && prevFileObject && (
                <div onClick={handlePrevClick} className="absolute inset-y-0 w-30 hover:bg-black/10 cursor-pointer flex items-center">
                    <ChevronLeft size={62} className="text-gray-300 m-5" />
                </div>
            )}
            {!isMobile && nextFileObject && (
                <div onClick={handleNextClick} className="absolute right-0 inset-y-0 w-30 hover:bg-black/10 cursor-pointer flex items-center">
                    <ChevronRight size={62} className="text-gray-300 ml-9" />
                </div>
            )}
            <X size={43} onClick={handleClose} className="text-gray-300 cursor-pointer absolute top-1 right-1" />
        </div>
    );
}