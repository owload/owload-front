import { useFilesStore } from "@/stores/files-store";
import FileObject from "./file-object";
import { SelectableItem } from "./selectable-area";
import { FileObjectsContextMenu } from "./file-objects-context-menu";
import { useEffect, useState } from "react";
import { PATH_SYMBOL_REAPLACEMENT, SYSTEM_PREFIX, thumbnailFileNamePrefix, useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { FileProperties } from "@/types/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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

    const mobileSizePx = Math.floor(window.innerWidth / 3) - 30;
    const gapSizePx = 16;

    return (
        <div className={cn("absolute inset-x-0 inset-y-0", {
            "top-12 pt-2 pb-15 overflow-scroll flex flex-wrap justify-center": isMobile,
            "top-15 pt-10 pl-10 pb-15 overflow-scroll": !isMobile
        })}>
            <div style={{ width: isMobile ? mobileSizePx*3 + gapSizePx*3 : 'auto' }} className="pl-3 xs:pl-0">
                {
                    fileObjects
                        .filter((fileObject: FileProperties) => !fileObject.name.startsWith(SYSTEM_PREFIX))
                        .map((fileObject: FileProperties, index: number) => (
                            <FileObjectsContextMenu key={index} fileObject={fileObject}>
                                <SelectableItem id={fileObject.id} key={index}>
                                    <FileObject
                                        fileObject={fileObject}
                                        thumbnail={thumbnails.get(fileObject.id)}
                                        size={isMobile ? mobileSizePx : 160}
                                        draggable={!isMobile}
                                        className={cn("inline-block mr-5 mb-5", {
                                            "mr-3 mb-3": isMobile,
                                            "mr-5 mb-5": !isMobile,
                                        })}
                                    />
                                </SelectableItem>
                            </FileObjectsContextMenu>
                        ))
                }
            </div>
        </div>
    );
}
