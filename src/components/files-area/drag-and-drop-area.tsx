import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDragEventUpload } from "@/hooks/use-upload";
import { useFilesStore } from "@/stores/files-store";
import { Children, PropsWithChildren, cloneElement, useState } from "react";

export function DragAndDropArea({ children }: PropsWithChildren) {
    const isDisabled = useIsMobile();
    const dragHappening = useFilesStore(state => state.dragHappening);
    const { pwd } = useFilesStoreOps();
    const dragEventUpload = useDragEventUpload();
    const [_, setDragEnterCounter] = useState(0);

    function handleDragEnter(event: React.DragEvent) {
        event.preventDefault();
        if (dragHappening) { // html objects are moved, not files from filesystem
            return;
        }
        const target = event.currentTarget as HTMLElement;
        setDragEnterCounter((prevCounter) => {
            if (prevCounter === 0) {
                target.classList.add("dragged");
            }
            return prevCounter + 1;
        });
    }

    function handleDragLeave(event: React.DragEvent) {
        event.preventDefault();
        if (dragHappening) { // html objects are moved, not files from filesystem
            return;
        }
        const target = event.currentTarget as HTMLElement;
        setDragEnterCounter((prevCounter) => {
            const newCounter = prevCounter - 1;
            if (newCounter === 0) {
                target.classList.remove("dragged");
            }
            return newCounter;
        });
    }

    function handleDrop(event: React.DragEvent) {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        target.classList.remove("dragged");
        setDragEnterCounter(0);
        if ((event as any).processedInFileObject) { // object is dropped on folder; processed in folder FileObject event
            return;
        }
        dragEventUpload(pwd()!, event);
    }

    function handleDragOver(event: React.DragEvent) {
        event.preventDefault();
        if (dragHappening) { // html objects are moved, not files from filesystem
            //event.dataTransfer.dropEffect = 'none';
        }
    }

    function drillToDivOrMain(children: React.ReactNode): React.ReactNode {
        const childrenArray = Children.toArray(children) as React.ReactElement<any>[];
        if (childrenArray.length !== 1) {
            throw new Error("DragAndDropArea descendants must have exactly one child until div or main is found");
        }
        if (childrenArray[0].type === "div" || childrenArray[0].type === "main") {
            return cloneElement(childrenArray[0], {
                onDragEnter: handleDragEnter,
                onDragLeave: handleDragLeave,
                onDragOver: handleDragOver,
                onDrop: handleDrop
            });
        }
        return cloneElement(childrenArray[0], {}, drillToDivOrMain(childrenArray[0].props.children));
    }

    if (isDisabled) {
        return <>
            {children}
        </>;
    } else {
        return <>
            {drillToDivOrMain(children)}
        </>;
    }
}

