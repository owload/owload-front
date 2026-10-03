import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createDirveStatsSlice, DrivesSlice } from './drive-stats-slice';
import { createKeysSlice, KeysSlice } from './keys-slice';
import { createFilesSlice, FilesSlice } from './files-slice';
import { createUploadSlice, UploadSlice } from './upload-slice';
import { createFsOpsDialogSlice, FsOpsDialogSlice } from './fs-ops-dialog-slice';
import { createMediaPreviewSlice, MediaPreviewSlice } from './media-preview-slice';
import { CopyPasteSlice, createCopyPasteSlice } from './copy-paste-slice';

export const useFilesStore = create<KeysSlice & DrivesSlice & FilesSlice & UploadSlice & FsOpsDialogSlice & MediaPreviewSlice & CopyPasteSlice>()(
  persist(
    (...a) => (
      {
        ...createKeysSlice(...a),
        ...createDirveStatsSlice(...a),
        ...createFilesSlice(...a),
        ...createUploadSlice(...a),
        ...createFsOpsDialogSlice(...a),
        ...createMediaPreviewSlice(...a),
        ...createCopyPasteSlice(...a),
      }),
    {
      name: "owload_fstorage",
      partialize: (state) => ({
        driveKeys: state.driveKeys,
        driveStats: state.driveStats
      }),
    }
  ));

// Sync drive keys/stats across browser tabs: when another tab closes a drive,
// rehydrate so this tab's in-memory state matches localStorage.
window.addEventListener('storage', (event) => {
  if (event.key === 'owload_fstorage') {
    useFilesStore.persist.rehydrate();
  }
});







