import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb";
import { ROOT_NODE_ID } from "@/engine";
import { Fragment } from "react/jsx-runtime";
import { useGetNavigateDirUrl, useNavigateDir } from "@/hooks/use-navigate-dir";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { cn, truncate } from "@/lib/utils";
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

export function PathBreadcrumbs() {
    const navigateDir = useNavigateDir();
    const getNavigateDirUrl = useGetNavigateDirUrl();
    const { pwdWithId } = useFilesStoreOps();
    const pathItems = pwdWithId();
    const mediaBreakpoint = useMediaBreakpoint();
    const driveDescription = useFilesStore.getState().driveClient?.getDescription();

    const pathComponetnsLenght = 1 + pathItems.length;
    const driveDescriptionSymbolsLength = Math.min(driveDescription?.length || 0, nameTruncateLen);
    const symbolsLength = driveDescriptionSymbolsLength
        + pathItems.reduce((acc: number, cur) => {
            const l = cur.pathComponent.length;
            return acc + Math.min(l, nameTruncateLen);
        }, 0);
    const totalSymbolLength = symbolsLength + pathComponetnsLenght * 6;
    const hideBreadcrumbs = (!mediaBreakpoint || totalSymbolLength > maxSymbolsCapacity[mediaBreakpoint]);

    return (
        <>
            <span className='text-sm text-gray-500 cursor-pointer' onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigateDir(ROOT_NODE_ID); }}>
                {truncate(useFilesStore.getState().driveClient?.getDescription() || "", nameTruncateLen)}
            </span>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbSeparator />
                    {
                        pathItems.map((pi, index) => (
                            index < pathItems.length - 1 ? (<Fragment key={pi.dirId}>
                                <BreadcrumbItem className={cn("", {
                                    "hidden": hideBreadcrumbs,
                                    "block": !hideBreadcrumbs
                                })}>
                                    <BreadcrumbLink
                                        href={getNavigateDirUrl(pi.dirId)}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigateDir(pi.dirId); }}
                                    >
                                        {truncate(pi.pathComponent, nameTruncateLen)}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className={cn("", {
                                    "hidden": hideBreadcrumbs,
                                })} />
                            </Fragment>)
                                : (<Fragment key={pi.dirId}>

                                    <BreadcrumbEllipsis className={cn("", {
                                        "hidden": !hideBreadcrumbs,
                                    })} />
                                    <BreadcrumbSeparator className={cn("", {
                                        "hidden": !hideBreadcrumbs,
                                    })} />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>{truncate(pi.pathComponent, nameTruncateLen)}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </Fragment>
                                )
                        ))
                    }
                </BreadcrumbList>
            </Breadcrumb>
        </>
    );
}