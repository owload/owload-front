import { FsObjectType } from "@/engine";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useDragEventUpload } from "@/hooks/use-upload";
import { cn, joinPath, truncate } from "@/lib/utils";
import { useFilesStore } from "@/stores/files-store";
import { FileProperties } from "@/types/types";
import { Folder } from "lucide-react";
import { PointerEventHandler, useCallback, useMemo, useState } from "react";
import { Checkbox } from "../ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsMobileSelectModeOn } from "@/hooks/use-mobile-select-mode";
import { ExtensionBadge } from "./extension-badge";

interface FileObjectProps {
    fileObject: FileProperties
    thumbnail?: string;
    className?: string;
    size?: number;
    draggable?: boolean;
    onPointerDown?: PointerEventHandler<HTMLDivElement>;
    onClick?: PointerEventHandler<HTMLDivElement>;
    onContextMenu?: PointerEventHandler<HTMLDivElement>;
    ref?: (node: HTMLElement | null) => void;
}

const textBasedExtensions = ['txt', 'docx', 'doc', 'xlsx', 'xls', 'pdf'];

function FileObject({ fileObject, thumbnail, className, onPointerDown, onClick, onContextMenu, ref, size = 15, draggable = false }: FileObjectProps) {
    const [_, setDragEnterCounter] = useState(0);
    const [dragOverStyleApplied, setDragOverStyleApplied] = useState(false);
    const setDragHappening = useFilesStore(state => state.setDragHappening);
    const selectedFileObjects = useSelectedFileObjects();
    const textBasedFile = fileObject.type === FsObjectType.FILE && textBasedExtensions.includes(fileObject.extension || '');
    const { downloadSelectedObject, openObject, downloadObject, isOpenAvailable, isDownloadAvailable, pwd, mv } = useFilesStoreOps();
    const dragEventUpload = useDragEventUpload();
    const mobileFileSelectModeOn = useIsMobileSelectModeOn();
    const isMobile = useIsMobile();
    const nameTruncateLen = Math.floor(size/8);

    const dragImg = useMemo(() => {
        const image = new Image();
        image.src = "/files-drag.svg";
        return image;
    }, []);

    const handleDragStart = useCallback(
        (event: React.DragEvent) => {
            setDragHappening(true);
            if (selectedFileObjects.length > 1) {
                event.dataTransfer.setDragImage(dragImg, 70, 70);
            }
        },
        [selectedFileObjects, dragImg]
    );

    const handleDragEnd = useCallback(() => {
        setDragHappening(false);
    }, []);

    const handleDragEnter = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        if (fileObject.type !== FsObjectType.DIR) {
            return;
        }
        setDragEnterCounter((prevCounter) => {
            if (prevCounter === 0) {
                setDragOverStyleApplied(true);
            }
            return prevCounter + 1;
        });
    }, [fileObject]);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        if (fileObject.type !== FsObjectType.DIR) {
            return;
        }
        setDragEnterCounter((prevCounter) => {
            const newCounter = prevCounter - 1;
            if (newCounter === 0) {
                setDragOverStyleApplied(false);
            }
            return newCounter;
        });
    }, [fileObject]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (fileObject.type === FsObjectType.DIR) {
            event.dataTransfer.dropEffect = 'move';
        } else if (useFilesStore.getState().dragHappening) {
            event.dataTransfer.dropEffect = 'none';
        }
    }, [fileObject]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        if (fileObject.type === FsObjectType.DIR) {
            (event as any).processedInFileObject = true;
            setDragOverStyleApplied(false);
            setDragEnterCounter(0);
            const destDirPath = joinPath(pwd()!, fileObject.name);
            if (useFilesStore.getState().dragHappening) {
                // objects from webapp dropped
                mv(pwd()!, selectedFileObjects.map(fo => fo.name), destDirPath);
            } else {
                // objects from OS filesystem dropped
                dragEventUpload(destDirPath, event);
            }
        }
    }, [fileObject, selectedFileObjects]);

    function open() {
        if (isOpenAvailable([fileObject])) {
            openObject(fileObject);
        } else if (!isMobile && isDownloadAvailable([fileObject])) {
            downloadObject(fileObject);
        }
    }

    const handleClick: PointerEventHandler<HTMLDivElement> = (e) => {
        if (isMobile && !mobileFileSelectModeOn) {
            open();
            if (fileObject.type !== FsObjectType.DIR) {
                onPointerDown?.(e);
            }
        } else if (onClick) {
            onClick(e);
        }
    }

    function handleDoubleClick() {
        if (isMobile) {
            if (isDownloadAvailable([fileObject])) {
                downloadSelectedObject();
            }
            return;
        }
        open();
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isMobile && !mobileFileSelectModeOn) {
            return;
        }
        onPointerDown?.(e);
    }

    return (
        <div className={cn(
            "group",
            className
        )}
            draggable={draggable}
            onDrop={handleDrop}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onContextMenu={onContextMenu}
            ref={ref}
        >
            <div
                style={{ width: `${size}px`, height: `${size}px` }}
                className={
                    cn(
                        "group relative rounded-xl flex items-center justify-center hover:border-[#FFDA15] border-1 group-hover:duration-200 overflow-hidden",
                        {
                            'group-hover:bg-[#EAEDF4]': !(fileObject.type === FsObjectType.FILE && !fileObject.finished) && !fileObject.selected && !fileObject.selectedForCut && !dragOverStyleApplied,
                            'bg-[#EFF0F5]': !(fileObject.type === FsObjectType.FILE && !fileObject.finished) && !fileObject.selected && !dragOverStyleApplied,
                            'bg-[#FFF2AC]': !(fileObject.type === FsObjectType.FILE && !fileObject.finished) && fileObject.selected && !dragOverStyleApplied,
                            'bg-gray-300': dragOverStyleApplied,
                            'opacity-45': fileObject.selectedForCut,
                            'bg-[#EFF0F5] animate-pulse group-hover:duration-2000': fileObject.type === FsObjectType.FILE && !fileObject.finished
                        }
                    )}>
                <ExtensionBadge extension={fileObject.extension || ''} className="absolute top-0 right-0"></ExtensionBadge>

                {mobileFileSelectModeOn && <Checkbox className="absolute top-1 left-1" checked={fileObject.selected} />}

                {textBasedFile && (
                    <>
                        <p className="text-[2pt] p-4 whitespace-pre-line">{loremIpsum}</p>
                    </>
                )}

                {!thumbnail && <FileObjectIcon {...fileObject} />}
                {thumbnail && (
                    <div>
                        <img src={thumbnail} style={{ minWidth: `${size}px`, minHeight: `${size}px`, maxWidth: `${size*2}px`, maxHeight: `${size*2}px`}} className={"rounded-md overflow-hidden"} />
                        <div style={{ width: `${size}px`, height: `${size}px` }} className={cn("absolute left-0 top-0 rounded-xl",
                            {
                                "hover:bg-primary/5": !fileObject.selected,
                                "bg-primary/40": fileObject.selected
                            }
                        )}></div>
                    </div>
                )}
            </div>
            <div className="mt-2">
                <center><p className="text-sm text-gray-800">{truncate(fileObject.name, nameTruncateLen)}</p></center>
            </div>
        </div>
    );
}

function FileObjectIcon(fileObject: FileProperties) {

    if (fileObject.type === FsObjectType.DIR) {
        return <Folder size={40} fill="#FFDA15" strokeWidth={0} />;
    }
    if (textBasedExtensions.includes(fileObject.extension || '')) {
        return null;
    }

    switch (fileObject.extension) {
        case 'mp4':
        case 'avi':
        case 'mkv':
            return <img src="/icons/file-video.svg" className="h-9" draggable={false} />;
        case 'jpg':
        case 'jpeg':
        case 'png':
            return <img src="/icons/file-img.svg" className="h-9" draggable={false} />;
        case 'zip':
        case 'rar':
            return <img src="/icons/file-box.svg" className="h-9" draggable={false} />;
        default:
            return <img src="/icons/file.svg" className="h-9" draggable={false} />;
    }

}

export default FileObject;

const loremIpsum = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.

Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.

It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).

There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.`;