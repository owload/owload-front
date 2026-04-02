
import { useUserInfo } from '@/auth-context-provider';
import { useFilesStore } from '@/stores/files-store';
import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useFilesStoreOps } from '@/hooks/use-files-store-ops';
import { AbortContext } from '@/types/types';
import { DialogClosedError } from '@/types/errors';

export function DriveExplorerPage() {
  const navigate = useNavigate();
  const passwordRetryFlag = useFilesStore((state) => state.passwordRetryFlag);
  const setPasswordRetryFlag = useFilesStore((state) => state.setPasswordRetryFlag);

  const setMediaPreviewOpen = useFilesStore((state) => state.setMediaPreviewOpen);
  const drivesInitialized = useFilesStore((state) => state.drivesInitialized);

  const { driveId, dirId } = useParams();


  const { initialize, cdByDirId, cd, sync } = useFilesStoreOps();
  const filesInitialized = useFilesStore((state) => state.filesInitialized);
  const setFilesInitialized = useFilesStore((state) => state.setFilesInitialized);
  const clearFiles = useFilesStore((state) => state.clearFiles);

  const userInfo = useUserInfo();

  useEffect(() => {
    if (!drivesInitialized) {
      return;
    }
    setFilesInitialized(false);

    const abortContext: AbortContext = { aborted: false };
    const initialPath = "";
    initialize(userInfo.id, driveId!, userInfo.privateKey!, undefined, initialPath, abortContext)
      .then(() => {
        if (abortContext.aborted) {
          return;
        }
        if (dirId) {
          cdByDirId(dirId);
        }
        else {
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
    if (dirId) {
      cdByDirId(dirId);
    } else {
      cd("/");
    }
  }, [dirId]);

  useEffect(() => {
    return () => {
      clearFiles();
    };
  }, [driveId]);


  return (
    <Outlet />
  )
}
