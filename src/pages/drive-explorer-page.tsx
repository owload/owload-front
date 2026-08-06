
import { useFilesStore } from '@/stores/files-store';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFilesStoreOps } from '@/hooks/use-files-store-ops';
import { AbortContext } from '@/types/types';
import { DialogClosedError } from '@/types/errors';

export function DriveExplorerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileNotFound = (location.state as any)?.fileNotFound === true;

  const passwordRetryFlag = useFilesStore((state) => state.passwordRetryFlag);
  const setPasswordRetryFlag = useFilesStore((state) => state.setPasswordRetryFlag);

  const setMediaPreviewOpen = useFilesStore((state) => state.setMediaPreviewOpen);
  const setTextEditorOpen = useFilesStore((state) => state.setTextEditorOpen);
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
            navigate(`/drive/${driveId}`, { state: { fileNotFound: true } });
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
    setTextEditorOpen(false);
    if (dirId) {
      cdByDirId(dirId).then(found => {
        if (!found) {
          navigate(`/drive/${driveId}`, { state: { fileNotFound: true } });
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


  return (
    <>
      {fileNotFound && (
        <div className="absolute top-14 inset-x-0 z-50 flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
          <span>This file no longer exists.</span>
          <button
            className="ml-auto text-amber-600 hover:text-amber-900"
            onClick={() => navigate(location.pathname, { replace: true, state: {} })}
          >✕</button>
        </div>
      )}
      <Outlet />
    </>
  )
}
