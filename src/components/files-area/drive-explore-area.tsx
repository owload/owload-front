import { FilesArea } from '@/components/files-area/files-area';
import { DirectoryHeader } from '@/components/files-area/directory-header';
import { SelectArea } from '@/components/files-area/selectable-area';
import { MediaPreview } from '@/components/media-preview/media-preview';
import { EditorHost } from '@/components/editor-host/editor-host';
import { DragAndDropArea } from '@/components/files-area/drag-and-drop-area';
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
    const editorOpen = useFilesStore((state) => state.editorOpen);
    const isSelected = useIsSelectedFileObject();
    const mobileFileSelectModeOn = useIsMobileSelectModeOn();
    const isReadyForActions = filesInitialized && driveStats?.description;

    const mainContent = (
        <main className='group absolute inset-0 select-none'>
            <div className="hidden group-[.dragged]:block absolute z-50 inset-0 bg-sunny-yellow/15 pointer-events-none"></div>
            <DirectoryHeader showPath={!mobileFileSelectModeOn} showViewSwitch={!!isReadyForActions} locked={!!filesInitialized && !driveStats?.description} />
            <FilesArea />
            {!mediaPreviewOpen && !editorOpen && isReadyForActions && <ToolboxBottom className="absolute inset-x-0 bottom-5 z-20" />}
        </main>
    );

    return (<>
        <div className='absolute top-18 bottom-0 inset-x-0'>
            {isReadyForActions ? (
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
                        {mainContent}
                    </SelectArea>
                </DragAndDropArea>
            ) : mainContent}
        </div>
        {mediaPreviewOpen && <MediaPreview />}
        {editorOpen && <EditorHost />}
    </>);
}