import { useFilesStore } from "@/stores/files-store";
import { getPreviewFileName, imageExtensions, playableVideoExtensions, PREVIEW_SIZES, useFilesStoreOps } from "./use-files-store-ops";
import { OperationCancelledError, ProgressCallback, ProgressInfo } from "@/engine";
import { UploadQueueItem, UploadQueueItemStatus } from "@/types/types";
import { DialogClosedError } from "@/types/errors";
import { generateImagePreviews, generateVideoPreviews } from "@/lib/preview-gen";
import { OperationCancellationReason } from "@/engine/service/drive-client";

export function useEnqueueFileUpload() {
  const uploadQueue = useFilesStore((state) => state.uploadQueue);

  const setUploadQueue = useFilesStore((state) => state.setUploadQueue);
  const uploadQueuePromise = useFilesStore((state) => state.uploadQueuePromise);
  const setUploadQueuePromise = useFilesStore((state) => state.setUploadQueuePromise);
  const { uploadFile, rm } = useFilesStoreOps();

  return async function (files: File[], path: string) {
    const newItems = files.map((file) => ({
      uploadId: crypto.randomUUID(),
      file,
      path,
      progressInfo: {
        'MAIN': {
          encrypted: 0,
          transferred: 0,
          total: file.size
        }
      },
      status: "QUEUED" as UploadQueueItemStatus,
      abortController: new AbortController(),
    })) as UploadQueueItem[];

    for (let item of newItems) {
      item.previews = await generateMediaPreviews(item.file);
      if (item.previews) {
        item.thumbnailUrl = URL.createObjectURL(item.previews[PREVIEW_SIZES.THUMBNAIL]);
        for (let key in item.previews) {
          item.progressInfo['PREVIEW_' + key] = {
            encrypted: 0,
            transferred: 0,
            total: item.previews[+key].size
          };
        }
      }
    }

    if (uploadQueue?.[0] && uploadQueue?.[0]?.status !== "QUEUED") {
      mutateUploadItem(uploadQueue[0].uploadId, (item) => { item.progressThreshold = true; return item; });
    }
    if (!uploadQueuePromise) {
      setUploadQueuePromise(Promise.resolve());
    }
    const newUploadQueuePromise = newItems.slice().reverse().reduce(async (prevPromise, item) => {
      await prevPromise;
      if (item.abortController.signal.aborted) {
        return;
      }
      setUploadItemStatus(item.uploadId, "PROGRESS");
      try {
        const fileId = await uploadFile(item.file, path, getUploadProgressCallback(item.uploadId), undefined, item.abortController.signal);
        if (item.previews) {
          for (let key in item.previews) {
            const size = +key;
            const thumbnail = item.previews[size];
            (thumbnail as any)["name"] = getPreviewFileName(fileId, size);
            const thumbFile = <File>thumbnail;
            await uploadFile(thumbFile, path, getUploadProgressCallback(item.uploadId, size), undefined, item.abortController.signal);
          }
        }
        setUploadItemStatus(item.uploadId, "FINISHED");
      } catch (error) {
        if ((error instanceof OperationCancelledError && error.reason === OperationCancellationReason.REQUEST_MODE_CANCELLATION) || error instanceof DialogClosedError) {
          setUploadItemStatus(item.uploadId, "CANCELLED");
        }
        else if (error instanceof OperationCancelledError || (error instanceof DOMException && error.name === "AbortError")) {
          setUploadItemStatus(item.uploadId, "CANCELLED");
          await rm([item.file.name], path);
        } else {
          setUploadItemStatus(item.uploadId, "ERROR");
        }
      }
    }, uploadQueuePromise);

    function getUploadProgressCallback(uploadId: string, previewSize?: number): ProgressCallback {
      return (progressInfo: ProgressInfo) => {
        mutateUploadItem(uploadId, (uploadItem) => { uploadItem.progressInfo[previewSize ? 'PREVIEW_' + previewSize : 'MAIN'] = progressInfo; return uploadItem; });
      }
    }

    setUploadQueue([...newItems, ...uploadQueue]);
    setUploadQueuePromise(newUploadQueuePromise);
  }
}

function setUploadItemStatus(uploadId: string, status: UploadQueueItemStatus) {
  mutateUploadItem(uploadId, (uploadItem) => { uploadItem.status = status; return uploadItem; })
}

function mutateUploadItem(uploadId: string, mutate: (u: UploadQueueItem) => UploadQueueItem) {
  const uploadQueue = useFilesStore.getState().uploadQueue;
  const uploadItemIndex = uploadQueue.findIndex(item => item.uploadId === uploadId);
  if (uploadItemIndex >= 0) {
    const newUploadItem = mutate(uploadQueue[uploadItemIndex]);
    const newUploadQueue = [...useFilesStore.getState().uploadQueue];
    newUploadQueue[uploadItemIndex] = newUploadItem;
    useFilesStore.getState().setUploadQueue(newUploadQueue);
  }
}

export function useCancelUpload() {
  return (item: UploadQueueItem) => {
    if (item.status !== "PROGRESS" && item.status !== "QUEUED") {
      return;
    }
    item.abortController.abort();
    setUploadItemStatus(item.uploadId, "CANCELLED");
  }
}

export function useDragEventUpload() {
  const enqueueFileUpload = useEnqueueFileUpload();
  return function (path: string, event: React.DragEvent) {
    let files: File[] = [];
    if (event.dataTransfer.items) {
      files = [...event.dataTransfer.items]
        .filter(item => item.kind === "file")
        .map(item => item.getAsFile())
        .filter(item => item != null);
    } else {
      files = [...event.dataTransfer.files];
    }
    enqueueFileUpload(files, path);
  };
}

async function generateMediaPreviews(file: File) {
  const ext = file.name.split('.').pop()!.toLowerCase();
  if (imageExtensions.includes(ext)) {
    const previewSizes = [PREVIEW_SIZES.THUMBNAIL];
    if (file.size > 512 * 1024) {
      previewSizes.push(PREVIEW_SIZES.MEDIA_PREVIEW);
    }
    return generateImagePreviews(file, previewSizes);
  } else if (playableVideoExtensions.includes(ext)) {
    return generateVideoPreviews(file, PREVIEW_SIZES.THUMBNAIL);
  }
  return undefined;
}