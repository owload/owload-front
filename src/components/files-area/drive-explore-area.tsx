import { FilesArea } from '@/components/files-area/files-area';
import { PathBreadcrumbs } from '@/components/files-area/path-breadcrumbs';
import { SelectArea } from '@/components/files-area/selectable-area';
import { MediaPreview } from '@/components/media-preview/media-preview';
import { DragAndDropArea } from '@/components/files-area/drag-and-drop-area';
import { Toolbox } from '@/components/toolbox/toolbox';
import { ToolboxBottom } from '@/components/toolbox-bottom/toolbox-bottom';
import { useFilesStore } from '@/stores/files-store';
import { useIsSelectedFileObject } from '@/hooks/use-is-selected-file-object';
import { useIsMobileSelectModeOn } from '@/hooks/use-mobile-select-mode';
import { useGetCurrentDriveStats } from '@/hooks/use-get-current-drive-stats';


export function DriveExplorerArea() {
    const getCurrentDriveStats = useGetCurrentDriveStats();
    const driveStats = getCurrentDriveStats();
    const filesInitialized = useFilesStore((state) => state.filesInitialized);

    const deselectAll = useFilesStore((state) => state.deselectAll);
    const selectIds = useFilesStore((state) => state.selectIds);
    const addSelected = useFilesStore((state) => state.addSelected);
    const addSelectedWithShift = useFilesStore((state) => state.addSelectedWithShift);
    const removeSelected = useFilesStore((state) => state.removeSelected);
    const removeSelectedWithShift = useFilesStore((state) => state.removeSelectedWithShift);
    const mediaPreviewOpen = useFilesStore((state) => state.mediaPreviewOpen);
    const isSelected = useIsSelectedFileObject();
    const mobileFileSelectModeOn = useIsMobileSelectModeOn();
    const isReadyForActions = filesInitialized && driveStats?.description;

    return (<>
        <div className='absolute top-14 bottom-0 inset-x-0'>
            <DragAndDropArea>
                <SelectArea
                    deselectAll={deselectAll}
                    selectIds={selectIds}
                    addSelected={addSelected}
                    addSelectedWithShift={addSelectedWithShift}
                    removeSelected={removeSelected}
                    removeSelectedWithShift={removeSelectedWithShift}
                    isSelected={isSelected}
                >
                    <main className='group absolute inset-0 select-none'>
                        <div className="hidden group-[.dragged]:block absolute z-50 inset-0 bg-gray-300/20 pointer-events-none"></div>
                        <div className="sticky bg-white z-10 flex 2xs:flex-col sm:flex-row sm:items-center px-4 h-10 sm:h-15">
                            <div className='sm:flex-1 flex items-center gap-2 h-full order-1 overflow-hidden'>
                                {!mobileFileSelectModeOn && <PathBreadcrumbs />}
                            </div>
                            {isReadyForActions && <Toolbox className="order-2" />}
                        </div>
                        <FilesArea />
                        {!mediaPreviewOpen && isReadyForActions && <ToolboxBottom className="fixed bottom-4 right-2 sm:right-4" />}
                    </main>

                </SelectArea>
            </DragAndDropArea>
        </div >
        {mediaPreviewOpen && <MediaPreview />}
    </>);
}