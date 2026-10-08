import { ReactNode } from "react";
import { ExternalLink, Files, FolderOpen, Info, SquarePen, SquareScissors, Trash, CloudDownload } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "../ui/drawer";
import { FsObjectType } from "@/engine";
import { FileProperties } from "@/types/types";
import { cn } from "@/lib/utils";
import { getColorClassname } from "./extension-badge";
import { readableSize } from "./file-object";

export type FileActionsSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    files: FileProperties[];
    canOpen: boolean;
    canDownload: boolean;
    /** False for a reader: the sheet then has no rename, copy, cut or delete. */
    canWrite?: boolean;
    onOpen: () => void;
    onOpenInNewTab: () => void;
    onDownload: () => void;
    onRename: () => void;
    onCopy: () => void;
    onCut: () => void;
    onDelete: () => void;
    onProperties: () => void;
};

/** The file actions on a phone: a light bottom sheet with the file in its head. Same entries as the context menu. */
export function FileActionsSheet(props: FileActionsSheetProps) {
    const { files } = props;
    const first = files[0];
    const single = files.length === 1;
    const isDir = first?.type === FsObjectType.DIR;
    const extension = first?.extension || "";

    // close the sheet first, then run the action
    const run = (action: () => void) => () => {
        props.onOpenChange(false);
        action();
    };

    const subtitle = !single
        ? `${files.length} items`
        : isDir
        ? "Folder"
        : [extension.toUpperCase(), first?.byteLength !== undefined ? readableSize(first.byteLength) : ""].filter(Boolean).join(" · ");

    return (
        <Drawer open={props.open} onOpenChange={props.onOpenChange}>
            <DrawerContent className="rounded-t-[20px] bg-white px-3 pb-3.5 pt-2 text-sunny-ink outline-none">
                <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#d9d7cf]" />
                <div className="mb-1.5 flex items-center gap-3 border-b border-[#e3e1d8] px-2 pb-2.5 pt-1">
                    <span aria-hidden="true" className={cn("flex size-10 flex-none items-center justify-center rounded-[9px] text-[10px] font-bold uppercase text-white", isDir ? "bg-sunny-yellow text-sunny-ink" : getColorClassname(extension))}>
                        {isDir ? <FolderOpen className="size-5" /> : extension.slice(0, 4) || "file"}
                    </span>
                    <div className="flex min-w-0 flex-col">
                        <DrawerTitle className="truncate text-sm font-semibold">{single ? first?.name : `${files.length} selected`}</DrawerTitle>
                        <DrawerDescription className="text-[13px] text-muted-foreground">{subtitle}</DrawerDescription>
                    </div>
                </div>
                <div role="menu" className="flex flex-col">
                    {props.canOpen && <Item icon={<FolderOpen />} onClick={run(props.onOpen)}>Open</Item>}
                    {props.canOpen && single && !isDir && <Item icon={<ExternalLink />} onClick={run(props.onOpenInNewTab)}>Open in new tab</Item>}
                    {props.canDownload && <Item icon={<CloudDownload />} onClick={run(props.onDownload)}>Download</Item>}
                    {(props.canOpen || props.canDownload) && <Separator />}
                    {props.canWrite !== false && <>
                        {single && <Item icon={<SquarePen />} onClick={run(props.onRename)}>Rename</Item>}
                        <Item icon={<Files />} onClick={run(props.onCopy)}>Copy</Item>
                        <Item icon={<SquareScissors />} onClick={run(props.onCut)}>Cut</Item>
                        <Separator />
                        <Item icon={<Trash />} destructive onClick={run(props.onDelete)}>Delete</Item>
                    </>}
                    {single && !isDir && <Item icon={<Info />} onClick={run(props.onProperties)}>Properties</Item>}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function Item({ icon, destructive, onClick, children }: { icon: ReactNode; destructive?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={cn(
                "flex h-12 w-full cursor-pointer items-center gap-3.5 rounded-[10px] px-2 text-left text-sm font-medium outline-ring hover:bg-[#f2f2ef] focus-visible:outline-2 [&_svg]:size-5 [&_svg]:flex-none",
                destructive ? "text-[#b3261e]" : "text-sunny-ink"
            )}
        >
            {icon}
            <span>{children}</span>
        </button>
    );
}

function Separator() {
    return <div role="separator" className="my-1 h-px bg-[#e3e1d8]" />;
}
