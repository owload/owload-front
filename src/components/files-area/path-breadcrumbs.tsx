import { ChevronRight } from "lucide-react";
import { ROOT_NODE_ID } from "@/engine";
import { useNavigateDir } from "@/hooks/use-navigate-dir";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { truncate } from "@/lib/utils";
import { MediaBreakpointValues, useMediaBreakpoint } from "@/hooks/use-media-breakpoint";

const maxSymbolsCapacity: MediaBreakpointValues = {
    "2xs": 60,
    "xs": 68,
    "sm": 84,
    "md": 40,
    "lg": 78,
    "xl": 120
};
const nameTruncateLen = 20;

const crumbClass = "flex min-h-11 cursor-pointer items-center font-semibold text-muted-foreground hover:text-foreground";

/** The path of the open folder: the drive, the folders on the way as links, and the open folder as the page title. */
export function PathBreadcrumbs() {
    const navigateDir = useNavigateDir();

    const { pwdWithId } = useFilesStoreOps();
    const pathItems = pwdWithId();
    const mediaBreakpoint = useMediaBreakpoint();
    // The first step of the path is the drive, named by its title (the description says what is in it, and is shown elsewhere).
    const driveClient = useFilesStore((state) => state.driveClient);
    const driveTitle = useFilesStore((state) => state.drives.find((d) => d.id === driveClient?.getDriveId())?.title);
    const driveName = driveTitle || driveClient?.getDescription() || "";

    const pathComponetnsLenght = 1 + pathItems.length;
    const driveNameSymbolsLength = Math.min(driveName.length, nameTruncateLen);
    const symbolsLength = driveNameSymbolsLength
        + pathItems.reduce((acc: number, cur) => {
            const l = cur.pathComponent.length;
            return acc + Math.min(l, nameTruncateLen);
        }, 0);
    const totalSymbolLength = symbolsLength + pathComponetnsLenght * 6;
    const hideBreadcrumbs = (mediaBreakpoint !== undefined && totalSymbolLength > maxSymbolsCapacity[mediaBreakpoint]);

    // The drive is the first step of the path; the open folder (or the drive itself at the root) is the title.
    const steps = [{ dirId: ROOT_NODE_ID as string, label: driveName }, ...pathItems.map((pi) => ({ dirId: pi.dirId as string, label: pi.pathComponent }))];
    const current = steps[steps.length - 1];
    const parents = steps.slice(0, -1);
    // With little room only the drive stays in front of the title; the folders between are replaced by an ellipsis.
    const shownParents = hideBreadcrumbs && parents.length > 1 ? [parents[0]] : parents;
    const hasHidden = shownParents.length < parents.length;

    const separator = <ChevronRight aria-hidden="true" className="size-[18px] flex-none text-muted-foreground" strokeWidth={2.4} />;

    return (
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1.5 text-[22px] tracking-[-0.02em] sm:text-[26px]">
            {shownParents.map((step) => (
                <span key={step.dirId} className="flex items-center gap-1.5">
                    <span
                        role="link"
                        tabIndex={0}
                        className={crumbClass}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); navigateDir(step.dirId); }}
                        onKeyDown={(e) => { if (e.key === "Enter") navigateDir(step.dirId); }}
                    >
                        {truncate(step.label, nameTruncateLen)}
                    </span>
                    {separator}
                </span>
            ))}
            {hasHidden && <span className="flex items-center gap-1.5"><span aria-label="Folders in between" className="font-semibold text-muted-foreground">…</span>{separator}</span>}
            <h1 className="m-0 flex min-h-11 items-center text-[length:inherit] font-bold">{truncate(current.label, nameTruncateLen)}</h1>
        </nav>
    );
}
