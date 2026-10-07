import { useFilesStore } from "@/stores/files-store";
import FileObject from "./file-object";
import { SelectableItem } from "./selectable-area";
import { FileObjectsContextMenu } from "./file-objects-context-menu";
import { useEffect, useState } from "react";
import { PATH_SYMBOL_REAPLACEMENT, SYSTEM_PREFIX, thumbnailFileNamePrefix, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { FileProperties } from "@/types/types";
import { useIsMobile } from "@/hooks/use-mobile";

export function PopulatedFilesArea() {
    const isMobile = useIsMobile();
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const { getFileData } = useFilesStoreOps();
    const [thumbnails, setThumbnails] = useState(new Map<string, string>());

    useEffect(() => {
        let aborted = false;
        const thumbnailFiles = fileObjects
            // filter only thumbnail files that are finished (not being uploaded right now)
            .filter((th: FileProperties) => th.name.startsWith(thumbnailFileNamePrefix) && th.finished)
            // map to file objects with the name without the prefix
            .map((th: FileProperties) => ({ ...th, name: th.name.slice(thumbnailFileNamePrefix.length).replaceAll(PATH_SYMBOL_REAPLACEMENT, "/") }))
            // filter only files that are not already in the thumbnails map
            .filter((th: FileProperties) => !thumbnails.has(th.name))
            // filter out files that are not neeeded
            .filter((th: FileProperties) => fileObjects.some((fo: FileProperties) => fo.id === th.name));

        let promise = Promise.resolve();
        for (let thumbFile of thumbnailFiles) {
            promise = promise.then(async () => {
                if (!aborted && thumbnails.get(thumbFile.name) == null) {
                    const thumbData = await getFileData(thumbFile, true);
                    const f = new File([thumbData], thumbFile.name);
                    const url = URL.createObjectURL(f)
                    setThumbnails((map) => {
                        const newMap = new Map(map);
                        newMap.set(thumbFile.name, url);
                        return newMap;
                    });
                }
            });
        }
        return () => { aborted = true; }
    }, [fileObjects]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || e.defaultPrevented) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest?.('input, textarea, [role="dialog"], [contenteditable="true"]')) return;
            useFilesStore.getState().deselectAll();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <div className="absolute inset-x-0 inset-y-0 top-26 overflow-auto pb-28 pt-2 px-[clamp(16px,2.2vw,28px)]">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-[18px] sm:gap-y-[22px]">
                {
                    fileObjects
                        .filter((fileObject: FileProperties) => !fileObject.name.startsWith(SYSTEM_PREFIX))
                        .map((fileObject: FileProperties) => (
                            <FileObjectsContextMenu key={fileObject.id} fileObject={fileObject}>
                                <SelectableItem id={fileObject.id}>
                                    <FileObject
                                        fileObject={fileObject}
                                        thumbnail={thumbnails.get(fileObject.id)}
                                        draggable={!isMobile}
                                        className="min-w-0"
                                    />
                                </SelectableItem>
                            </FileObjectsContextMenu>
                        ))
                }
            </div>
        </div>
    );
}
