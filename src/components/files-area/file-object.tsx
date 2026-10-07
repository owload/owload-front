import { FsObjectType } from "@/engine";
import { SYSTEM_PREFIX, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useSelectedFileObjects } from "@/hooks/use-selected-file-objects";
import { useDragEventUpload } from "@/hooks/use-upload";
import { cn, joinPath } from "@/lib/utils";
import { useFilesStore } from "@/stores/files-store";
import { FileProperties } from "@/types/types";
import { Lock, MoreHorizontal } from "lucide-react";
import { PointerEventHandler, useCallback, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsMobileSelectModeOn } from "@/hooks/use-mobile-select-mode";
import { DocumentPreview, hasDocumentPreview } from "./document-preview";
import { ExtensionBadge, getColorClassname } from "./extension-badge";
import { registry } from "@/extensions/registry";

interface FileObjectProps {
    fileObject: FileProperties
    thumbnail?: string;
    className?: string;
    draggable?: boolean;
    view?: "grid" | "list";
    onPointerDown?: PointerEventHandler<HTMLDivElement>;
    onClick?: PointerEventHandler<HTMLDivElement>;
    onContextMenu?: PointerEventHandler<HTMLDivElement>;
    ref?: (node: HTMLElement | null) => void;
}

function FileObject({ fileObject, thumbnail, className, onPointerDown, onClick, onContextMenu, ref, draggable = false, view = "grid" }: FileObjectProps) {
    const [_, setDragEnterCounter] = useState(0);
    const [dragOverStyleApplied, setDragOverStyleApplied] = useState(false);
    const setDragHappening = useFilesStore(state => state.setDragHappening);
    const selectedFileObjects = useSelectedFileObjects();
    const isDir = fileObject.type === FsObjectType.DIR;
    const uploading = fileObject.type === FsObjectType.FILE && !fileObject.finished;
    const allFileObjects = useFilesStore(state => state.fileObjects);
    const driveClient = useFilesStore(state => state.driveClient);
    // How many things lie in a folder (the thumbnails the client keeps beside the files are not counted).
    const itemCount = useMemo(() => {
        if (!isDir || !driveClient) return null;
        try {
            return driveClient.ls(joinPath(driveClient.pwd(), fileObject.name)).filter(n => !n.name.startsWith(SYSTEM_PREFIX)).length;
        } catch {
            return null;
        }
    }, [isDir, driveClient, fileObject.name, fileObject.id, allFileObjects]);
    const { downloadSelectedObject, openObject, downloadObject, isOpenAvailable, isDownloadAvailable, pwd, mv } = useFilesStoreOps();
    const dragEventUpload = useDragEventUpload();
    const mobileFileSelectModeOn = useIsMobileSelectModeOn();
    const isMobile = useIsMobile();

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

    const selected = !!fileObject.selected;
    const cut = !!fileObject.selectedForCut;

    const sizeText = isDir
        ? (itemCount !== null ? `${itemCount} ${itemCount === 1 ? "item" : "items"}` : "")
        : uploading ? "Uploading…" : fileObject.byteLength !== undefined ? readableSize(fileObject.byteLength) : "—";
    const extension = fileObject.extension || "";

    if (view === "list") {
        return (
            <div
                className={cn(
                    "group grid min-h-[52px] max-sm:min-h-[60px] min-w-0 grid-cols-[minmax(0,1fr)_110px_44px] items-center gap-x-4 rounded-[10px] border-b border-[#eeede7] pl-3 pr-1 transition-colors duration-150 max-sm:grid-cols-[minmax(0,1fr)_44px] max-sm:[&>span:nth-child(2)]:hidden",
                    selected ? "border-transparent bg-[#fef5cc]" : "hover:border-transparent hover:bg-[#f2f2ef]",
                    cut && "opacity-45",
                    dragOverStyleApplied && "bg-sunny-yellow-soft",
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
                <div className="flex min-h-11 min-w-0 items-center gap-3 text-sm font-semibold">
                    {isDir ? (
                        <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center"><FolderArt size={32} /></span>
                    ) : thumbnail ? (
                        <img src={thumbnail} alt="" draggable={false} className={cn("size-9 flex-none rounded-[9px] object-cover", registry.forFileName(fileObject.name) && "object-left-top")} />
                    ) : (
                        <span aria-hidden="true" className={cn("flex size-9 flex-none items-center justify-center rounded-[9px] text-[9px] font-bold uppercase tracking-[0.04em] text-white", uploading ? "tile-uploading bg-sunny-field" : getColorClassname(extension))}>
                            {extension.slice(0, 4) || "file"}
                        </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                        <span className="flex min-w-0 items-center gap-1.5">
                            <Lock aria-hidden="true" className="size-[13px] flex-none text-muted-foreground" strokeWidth={2.2} />
                            <span className="truncate" title={fileObject.name}>{fileObject.name}</span>
                        </span>
                        {/* on a phone the size sits under the name; the column is hidden there */}
                        <span className="hidden text-[13px] font-normal text-muted-foreground max-sm:block">{sizeText}</span>
                    </span>
                </div>
                <span className={cn("whitespace-nowrap text-[13px]", selected ? "text-[#3b3a34]" : "text-muted-foreground")}>{sizeText}</span>
                <button
                    type="button"
                    aria-label={`Actions for ${fileObject.name}`}
                    aria-haspopup="menu"
                    onPointerDown={(e) => { e.stopPropagation(); onPointerDown?.(e as unknown as React.PointerEvent<HTMLDivElement>); }}
                    onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        e.currentTarget.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: rect.left, clientY: rect.bottom }));
                    }}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground outline-ring hover:bg-black/5 focus-visible:outline-2"
                >
                    <MoreHorizontal aria-hidden="true" className="size-[18px]" />
                </button>
            </div>
        );
    }

    return (
        <div className={cn(
            "group relative -m-1.5 flex min-w-0 flex-col gap-2 rounded-[18px] p-1.5 transition-colors duration-150",
            selected ? "bg-[#fef5cc]" : "hover:bg-[#f2f2ef]",
            cut && "opacity-45",
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
            {isDir ? (
                // A folder is a flat shape with a tab; nothing is drawn inside but the number of items.
                <div className="relative aspect-[4/3] w-full">
                    <div className={cn(
                        "absolute inset-x-0 bottom-0 top-3.5 flex flex-col justify-end rounded-b-[14px] rounded-tr-[14px] border px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors duration-150",
                        dragOverStyleApplied ? "bg-sunny-yellow" : "bg-[#fef5cc]",
                        selected ? "border-sunny-ink" : cut ? "border-dashed border-[#8f8d84] shadow-none" : "border-[#e6d38c] group-hover:border-[#cdb65f]"
                    )}>
                        {itemCount !== null && <span className="text-xs font-semibold text-[#3b3a34]">{itemCount} {itemCount === 1 ? "item" : "items"}</span>}
                    </div>
                    <span aria-hidden="true" className={cn(
                        "absolute left-0 top-0 h-[15px] w-[42%] rounded-t-[10px] border border-b-0 bg-[#fef5cc]",
                        dragOverStyleApplied && "bg-sunny-yellow",
                        selected ? "border-sunny-ink" : cut ? "border-dashed border-[#8f8d84]" : "border-[#e6d38c] group-hover:border-[#cdb65f]"
                    )} />
                </div>
            ) : (
                <div
                    className={cn(
                        "relative aspect-[4/3] w-full overflow-hidden rounded-[14px] border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-colors duration-150",
                        selected ? "border-sunny-ink" : cut ? "border-dashed border-[#8f8d84] shadow-none" : "border-[#d9d7cf] group-hover:border-[#8f8d84]",
                        { "tile-uploading bg-sunny-field": uploading }
                    )}>
                    <ExtensionBadge extension={fileObject.extension || ''} className="absolute right-0 top-0 z-10" />

                    {thumbnail && (
                        <img
                            src={thumbnail}
                            alt=""
                            draggable={false}
                            className={cn("absolute inset-0 size-full object-cover", registry.forFileName(fileObject.name) && "object-left-top")}
                        />
                    )}
                    {!thumbnail && !uploading && (hasDocumentPreview(fileObject.extension || '')
                        ? <DocumentPreview extension={fileObject.extension || ''} />
                        : <div className="absolute inset-0 flex items-center justify-center"><FileObjectIcon {...fileObject} /></div>)}
                </div>
            )}
            <div className="flex min-h-[22px] min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                <Lock aria-hidden="true" className="size-[13px] flex-none text-muted-foreground" strokeWidth={2.2} />
                <span className="truncate" title={fileObject.name}>{fileObject.name}</span>
            </div>
        </div>
    );
}

function FolderArt({ size }: { size: number }) {
    return (
        <svg width={size} height={Math.round(size * 0.8)} viewBox="0 0 80 64" aria-hidden="true" className="block flex-none">
            <path d="M4 12a6 6 0 0 1 6-6h17a4 4 0 0 1 3 1.4L35 13h35a6 6 0 0 1 6 6v35a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z" fill="#fadb58" />
        </svg>
    );
}

export function readableSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileObjectIcon(fileObject: FileProperties) {

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
