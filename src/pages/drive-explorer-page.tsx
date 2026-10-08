
import { useFilesStore } from '@/stores/files-store';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFilesStoreOps } from '@/hooks/use-files-store-ops';
import { AbortContext } from '@/types/types';
import { DialogClosedError } from '@/types/errors';
import { useOpenFileProperties } from '@/hooks/use-dialogs';
import { useCanWrite } from '@/hooks/use-drive-role';

export function DriveExplorerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileNotFound = (location.state as any)?.fileNotFound === true;
  const notFoundNodeId: string | undefined = (location.state as any)?.notFoundNodeId;

  const passwordRetryFlag = useFilesStore((state) => state.passwordRetryFlag);
  const setPasswordRetryFlag = useFilesStore((state) => state.setPasswordRetryFlag);

  const setMediaPreviewOpen = useFilesStore((state) => state.setMediaPreviewOpen);
  const setEditorOpen = useFilesStore((state) => state.setEditorOpen);
  const setNewEditorFile = useFilesStore((state) => state.setNewEditorFile);
  const drivesInitialized = useFilesStore((state) => state.drivesInitialized);

  const { driveId, dirId } = useParams();
  const driveKey = useFilesStore((state) => driveId ? state.driveKeys[driveId] : undefined);


  const { initialize, cdByDirId, cd, sync } = useFilesStoreOps();
  const filesInitialized = useFilesStore((state) => state.filesInitialized);
  const setFilesInitialized = useFilesStore((state) => state.setFilesInitialized);
  const clearFiles = useFilesStore((state) => state.clearFiles);

  useEffect(() => {
    if (!drivesInitialized) {
      return;
    }
    setFilesInitialized(false);

    const abortContext: AbortContext = { aborted: false };
    const initialPath = "";
    initialize(driveId!, undefined, initialPath, abortContext)
      .then(async () => {
        if (abortContext.aborted) {
          return;
        }
        if (dirId) {
          const found = await cdByDirId(dirId);
          if (!found) {
            navigate(`/drive/${driveId}`, { state: { fileNotFound: true, notFoundNodeId: dirId } });
          }
        } else {
          sync();
        }
        setFilesInitialized(true);
      })
      .catch((error) => {
        if (error instanceof DialogClosedError) {
          navigate("/");
        } else {
          throw error;
        }
      })
      .finally(() => {
        if (passwordRetryFlag) {
          setPasswordRetryFlag(false);
        }
      });
    return () => {
      abortContext.aborted = true;
      if (useFilesStore.getState().filesInitialized) {
        setFilesInitialized(false);
      }
    }
  }, [passwordRetryFlag, driveId, drivesInitialized]);

  useEffect(() => {
    if (!filesInitialized) {
      return;
    }
    setMediaPreviewOpen(false);
    setEditorOpen(false);
    setNewEditorFile(null);
    if (dirId) {
      cdByDirId(dirId).then(found => {
        if (!found) {
          navigate(`/drive/${driveId}`, { state: { fileNotFound: true, notFoundNodeId: dirId } });
        }
      });
    } else {
      cd("/");
    }
  }, [dirId]);

  useEffect(() => {
    return () => {
      clearFiles();
    };
  }, [driveId]);

  useEffect(() => {
    if (filesInitialized && !driveKey) {
      navigate('/');
    }
  }, [driveKey, filesInitialized]);


  const openFileProperties = useOpenFileProperties();
  const canWrite = useCanWrite();
  const publicToken = useFilesStore((state) => state.publicToken);

  return (
    <>
      {fileNotFound && (
        <div className="absolute top-18 inset-x-0 z-50 flex items-center gap-3 border-b border-[#f0d3bd] bg-[#fbeee4] px-4 py-2 text-sm font-medium text-sunny-orange">
          <span>This file no longer exists.</span>
          {notFoundNodeId && (
            <button
              className="underline hover:opacity-80"
              onClick={() => openFileProperties({ nodeId: notFoundNodeId, filePath: '', byteLength: 0 }).catch(() => {})}
            >
              View properties
            </button>
          )}
          <button
            className="ml-auto hover:opacity-80"
            onClick={() => navigate(location.pathname, { replace: true, state: {} })}
          >✕</button>
        </div>
      )}
      {!canWrite && (
        <div role="status" className="absolute top-18 inset-x-0 z-40 flex items-center gap-2 border-b border-sunny-line bg-sunny-yellow-soft px-4 py-1.5 text-[13px] font-semibold text-sunny-text-on-yellow">
          {publicToken ? "This is a public drive: you can view and download its files." : "You can view and download files in this drive, not change them."}
        </div>
      )}
      <Outlet />
    </>
  )
}
