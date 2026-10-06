import { Lock } from "lucide-react";
import { useFilesStore } from "@/stores/files-store";
import { SYSTEM_PREFIX } from "@/hooks/use-files-store-ops";
import { FsObjectType } from "@/engine";
import { Toolbox } from "@/components/toolbox/toolbox";
import { PathBreadcrumbs } from "./path-breadcrumbs";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The head of the files screen: the path, a line telling what is in the folder, and the view switch. */
export function DirectoryHeader({ showPath, showViewSwitch, locked = false }: { showPath: boolean, showViewSwitch: boolean, locked?: boolean }) {
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const visible = fileObjects.filter((fileObject) => !fileObject.name.startsWith(SYSTEM_PREFIX));
    const folders = visible.filter((fileObject) => fileObject.type === FsObjectType.DIR).length;
    const files = visible.length - folders;
    const selected = visible.filter((fileObject) => fileObject.selected).length;

    const summary = locked
        ? "Locked"
        : visible.length === 0
        ? "No files yet"
        : [
            [folders > 0 && plural(folders, "folder", "folders"), files > 0 && plural(files, "file", "files")].filter(Boolean).join(", "),
            "all encrypted",
            selected > 0 && `${selected} selected`,
        ].filter(Boolean).join(" · ");

    return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-[clamp(16px,2.2vw,28px)] pt-5">
            <div className="flex min-w-0 flex-col gap-0.5">
                {showPath && <PathBreadcrumbs />}
                <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Lock aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
                    <span>{summary}</span>
                </div>
            </div>
            {showViewSwitch && <Toolbox className="max-sm:hidden" />}
        </div>
    );
}
