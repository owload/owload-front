import { useFilesStore } from "@/stores/files-store";
import { useNavigateDir } from "./use-navigate-dir";
import { base64ToUint8Array, DriveClientFactory, FsObjectType, FsTreeNode, ProgressCallback, uint8ArrayToBase64, UserId, DriveId, RestFilesystemBackend, PreloadingFilesystemBackend, CachingFilesystemBackend, OperationCancelledError } from "@/engine";

import { AbortContext, FileProperties } from "@/types/types";
import { saveFileToDisk } from "@/lib/utils";
import { useRequestMvOperationMode, useRequestPassword } from "./use-dialogs";
import { FsOperationNameConflictMode } from "@/engine/service/fs-operation";
import { useDeactivateMobileSelectMode } from "./use-mobile-select-mode";

let swMessageEventListener: ((event: MessageEvent) => void) | undefined;
const swRequestReaders = new Map<string, { stream: ReadableStream, reader: ReadableStreamDefaultReader<Uint8Array> }>();

function getExtension(name: string) {
    const split = name.split('.');
    if (split.length === 1) {
        return '';
    }
    return split[split.length - 1].toLocaleLowerCase();
}

export const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'];
export const playableVideoExtensions: string[] = ['mp4', 'mov'];
export const openableExtensions = [...imageExtensions, ...playableVideoExtensions];

export const SYSTEM_PREFIX = "$$$sy$s$stem!_";
export const PATH_SYMBOL_REAPLACEMENT = "$"; // replace all / with this symbol in file names
export const PREVIEW_SIZES = {
    THUMBNAIL: 360,
    MEDIA_PREVIEW: 1024
}

export function getPreviewFileName(fileId: string, size: number) {
    return SYSTEM_PREFIX + "thumb_" + size + "_" + fileId.replaceAll("/", PATH_SYMBOL_REAPLACEMENT);
}

export const thumbnailFileNamePrefix = SYSTEM_PREFIX + "thumb_" + PREVIEW_SIZES.THUMBNAIL + "_";


export function useFilesStoreOps() {
    let driveClient = useFilesStore((state) => state.driveClient);
    const fileObjects = useFilesStore((state) => state.fileObjects);
    const setFileObjects = useFilesStore((state) => state.setFileObjects);
    const setDriveStats = useFilesStore((state) => state.setDriveStats);
    const setDriveClient = useFilesStore((state) => state.setDriveClient);
    const selectIds = useFilesStore((state) => state.selectIds);

    const setMediaPreviewOpen = useFilesStore((state) => state.setMediaPreviewOpen);
    const navigateDir = useNavigateDir();
    const requestPassword = useRequestPassword();
    const requestMvOperationMode = useRequestMvOperationMode();

    const filesToMoveOrCopy = useFilesStore((state) => state.filesToMoveOrCopy);
    const operationType = useFilesStore((state) => state.operationType);
    const setFilesToCopy = useFilesStore((state) => state.setFilesToCopy);
    const setFilesToMove = useFilesStore((state) => state.setFilesToMove);
    const clearFilesToMoveOrCopy = useFilesStore((state) => state.clearFilesToMoveOrCopy);

    const deactivateMobileSelectMode = useDeactivateMobileSelectMode();

    const assertInitialized = () => {
        if (driveClient == null) {
            throw new Error("Uninitialized");
        }
    }

    const askOperationModeIfNeeded = async (pathDest: string, fileNames: string[]): Promise<FsOperationNameConflictMode> => {
        assertInitialized();
        const fileNamesInDest = driveClient!.ls(pathDest).map(fo => fo.name);
        const fileNamesSet = new Set(fileNamesInDest);
        const commonFileNames = fileNames.filter(fileName => fileNamesSet.has(fileName));
        if (commonFileNames.length === 0) {
            return "RENAME";
        }
        return requestMvOperationMode({ commonFileNames });
    }

    const sync = () => {
        if (driveClient == null) {
            throw new Error("Uninitialized");
        }
        const updatedFileObjects = driveClient
            .ls("")
            .filter(fsTreeNode => fsTreeNode.type === FsObjectType.FILE)
            .map((fsTreeNode: FsTreeNode<FsObjectType.FILE>) => ({
                id: fsTreeNode.id,
                type: fsTreeNode.type,
                name: fsTreeNode.name,
                extension: getExtension(fsTreeNode.name),
                byteOffset: fsTreeNode.properties.byteOffset,
                byteLength: fsTreeNode.properties.byteLength,
                contentHash: fsTreeNode.properties.contentHash,
                finished: fsTreeNode.properties.finished
            }));
        const updatedDirObjects = driveClient
            .ls("")
            .filter(fsTreeNode => fsTreeNode.type === FsObjectType.DIR)
            .map((fsTreeNode: FsTreeNode<FsObjectType.DIR>) => ({
                id: fsTreeNode.id,
                type: fsTreeNode.type,
                name: fsTreeNode.name
            }));
        setFileObjects([...updatedDirObjects, ...updatedFileObjects]);
        const description = driveClient.getDescription();
        setDriveStats(driveClient.getDriveId(), { description });
        if (filesToMoveOrCopy?.fileNames?.length && !filesToMoveOrCopyExist()) {
            clearFilesToMoveOrCopy();
        }
        updateSelectedForCut();
    }

    const refresh = async () => {
        if (driveClient == null) {
            throw new Error("Uninitialized");
        }
        await driveClient.refresh();
        sync();
    }

    const cd = (path: string) => {
        if (driveClient == null) {
            throw new Error("Uninitialized");
        }
        driveClient.cd(path);
        sync();
    }

    const cdByDirId = async (dirId: string) => {
        if (driveClient == null) {
            throw new Error("Uninitialized");
        }
        const node = driveClient.getNodeById(dirId);
        if (!node) {
            throw new Error("Node not found");
        }
        if (node?.type === FsObjectType.DIR) {
            driveClient.cdByDirId(dirId);
            sync();
        } else {
            if (node.getParentNode()) {
                driveClient.cdByDirId(node.getParentNode()!.id);
            }
            sync();
            selectIds([node.id]);
            setMediaPreviewOpen(true);
        }
    }

    const initialize = async (userId: UserId, driveId: DriveId, userPrivateKey: CryptoKey, password: string | undefined, initialPath: string, abortContext: AbortContext) => {
        const driveInfo = useFilesStore.getState().drives.find(d => d.id === driveId);
        if (!driveInfo) {
            throw new Error("Drive not found in local store: " + driveId);
        }
        if (abortContext.aborted) { return; }
        const storedKeyExtracted = useFilesStore.getState().driveKeys?.[driveId];
        const addDriveKey = useFilesStore.getState().addDriveKey;
        const filesystemBackend = new RestFilesystemBackend();
        const cachingFilesystemBackend = new CachingFilesystemBackend(filesystemBackend);
        const preloadingFilesystemBackend = new PreloadingFilesystemBackend(cachingFilesystemBackend);
        let storedKeyEncoded: CryptoKey | undefined = undefined;
        if (storedKeyExtracted) {
            storedKeyEncoded = await crypto.subtle.importKey("raw", base64ToUint8Array(storedKeyExtracted), 'AES-CTR', false, ['encrypt', 'decrypt']);
        }
        else if (!password) {
            preloadingFilesystemBackend.preloadOperations(driveId, 0); // start preloading operations while user entering the password
            password = await requestPassword({ driveName: driveInfo.title });
            if (!password) {
                throw new Error("Password required");
            }
        }

        const factoryReturnValue = await DriveClientFactory.createDriveClient(userId,
            driveId,
            driveInfo.title,
            userPrivateKey,
            storedKeyEncoded,
            driveInfo.keyNonce,
            driveInfo.counterNonce,
            password,
            preloadingFilesystemBackend
        );
        const ccl = factoryReturnValue.driveClient;
        if (!storedKeyEncoded) {
            const keyExtracted = uint8ArrayToBase64(new Uint8Array(await crypto.subtle.exportKey("raw", factoryReturnValue.keyEncoded)));
            addDriveKey(driveId, keyExtracted);
        }

        if (swMessageEventListener) {
            navigator.serviceWorker.removeEventListener("message", swMessageEventListener);
        }
        swMessageEventListener = (event: MessageEvent) => {
            if (event.data.type === "startClientFetch") {
                const { byteOffset, byteLength } = event.data.data;
                ccl.getFileDataStream(byteOffset, byteLength, "").then(stream => {
                    swRequestReaders.set(event.data.requestId, { stream, reader: stream.getReader() });
                });
            } else if (event.data.type === "pullClientFetchData") {
                const rd = swRequestReaders.get(event.data.requestId);
                if (rd) {
                    const reader = rd.reader;
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            event.source?.postMessage({
                                type: "responseFinish",
                                requestId: event.data.requestId,
                                data: null
                            });
                            swRequestReaders.delete(event.data.requestId);
                            return;
                        }
                        event.source?.postMessage({
                            type: "responseData",
                            requestId: event.data.requestId,
                            data: value
                        });
                    });
                }

            } else if (event.data.type === "cancelClientFetch") {
                const rd = swRequestReaders.get(event.data.requestId);
                if (rd) {
                    rd.reader.cancel();
                    swRequestReaders.delete(event.data.requestId);
                }
            }
        };
        navigator.serviceWorker.addEventListener("message", swMessageEventListener);

        await ccl.refresh(abortContext);
        if (abortContext.aborted) { return; }
        driveClient = ccl;
        cd(initialPath);
        setDriveClient(ccl);
    }


    const updateSelectedForCut = () => {
        const state = useFilesStore.getState();
        const fileObjects = state.fileObjects;
        const filesToMoveOrCopy = state.filesToMoveOrCopy;
        const operationType = state.operationType;
        const curPath = pwd();

        setFileObjects(fileObjects.map(fo => {
            fo.selectedForCut = operationType === "MOVE" && filesToMoveOrCopy?.pathSrc === curPath && filesToMoveOrCopy?.fileNames.includes(fo.name);
            return fo;
        }));
    }

    const mkdir = async (path: string) => {
        assertInitialized();
        await driveClient!.mkdir(path);
        sync();
    }

    const getFileNodes = (path: string, fileNames: string[]): FsTreeNode<FsObjectType>[] => {
        assertInitialized();
        const filesInDir = driveClient!.ls(path);
        return filesInDir.filter(file => fileNames.includes(file.name));
    }

    const getRelevantSystemFiles = (fileName: string, path: string) => {
        assertInitialized();
        const res: string[] = [];
        const currentFiles = driveClient!.ls(path);
        console.log(currentFiles, fileName, path)
        const file = currentFiles.find(file => file.name === fileName);
        if (!file) {
            throw new Error("File not found: " + fileName);
        }
        const fileId = file.id;
        for (const previewSize of Object.values(PREVIEW_SIZES)) {
            const previewFileName = getPreviewFileName(fileId, previewSize);
            if (currentFiles.map(file => file.name).includes(previewFileName)) {
                res.push(previewFileName);
            }
        }
        return res;
    }

    const rm = async (fileNames: string[], basePath?: string) => {
        assertInitialized();
        deactivateMobileSelectMode();
        const allFilesToRemove = [
            ...fileNames,
            ...fileNames.flatMap(fileName => getRelevantSystemFiles(fileName, basePath || pwd()!))
        ];
        await driveClient!.rm(allFilesToRemove, basePath);
        sync();
    }

    const selectFilesToCopy = (pathSrc: string, fileNames: string[]) => {
        deactivateMobileSelectMode();
        setFilesToCopy(pathSrc, fileNames);
        setFileObjects(fileObjects.map(fo => { fo.selectedForCut = false; return fo; }));
        sync();
    }

    const selectFilesToMove = (pathSrc: string, fileNames: string[]) => {
        deactivateMobileSelectMode();
        setFilesToMove(pathSrc, fileNames);
        sync();
    }

    const filesToMoveOrCopyExist = () => {
        if (!filesToMoveOrCopy) {
            return false;
        }
        if (!filesToMoveOrCopy?.fileNames?.length) {
            return false;
        }
        const filesInSourceDir = driveClient!.ls(filesToMoveOrCopy.pathSrc).map(file => file.name);
        return filesToMoveOrCopy.fileNames.every(fileName => filesInSourceDir.includes(fileName));
    }


    const commitCopy = async (pathDest: string) => {
        const mode = await askOperationModeIfNeeded(pathDest, filesToMoveOrCopy!.fileNames);
        const relatedFileNames = filesToMoveOrCopy!.fileNames.map(fileName => getRelevantSystemFiles(fileName, filesToMoveOrCopy!.pathSrc));
        const fileNodesToCopy = getFileNodes(filesToMoveOrCopy!.pathSrc, filesToMoveOrCopy!.fileNames);
        const originalFileIds = fileNodesToCopy.map(file => file.id);
        const newFileIds = await driveClient!.cp(filesToMoveOrCopy!.pathSrc, filesToMoveOrCopy!.fileNames, pathDest, mode);
        if (originalFileIds.length !== newFileIds.length) {
            throw new Error(`Failed to copy files: originalFileIds.length is ${originalFileIds} and newFileIds.length is ${newFileIds}`);
        }
        const newRelatedFileNames = [];
        for (let i = 0; i < newFileIds.length; i++) {
            if (relatedFileNames[i].length === 0) {
                continue;
            }
            const originalIdPart = originalFileIds[i].replaceAll("/", PATH_SYMBOL_REAPLACEMENT);
            const newIdPart = newFileIds[i].replaceAll("/", PATH_SYMBOL_REAPLACEMENT);
            newRelatedFileNames.push(
                relatedFileNames[i].map(fname => fname.replace(originalIdPart, newIdPart))
            );
        }
        await driveClient!.cp(filesToMoveOrCopy!.pathSrc, relatedFileNames.flat(), pathDest, 'FIXED', newRelatedFileNames.flat());
    }

    const commitMove = async (pathDest: string) => {
        const mode = await askOperationModeIfNeeded(pathDest, filesToMoveOrCopy!.fileNames);
        const relatedFileNames = filesToMoveOrCopy!.fileNames.map(fileName => getRelevantSystemFiles(fileName, filesToMoveOrCopy!.pathSrc));
        if (filesToMoveOrCopy!.pathSrc !== pathDest) {
            await driveClient!.mv(filesToMoveOrCopy!.pathSrc, [
                ...filesToMoveOrCopy!.fileNames,
                ...relatedFileNames.flat()
            ], pathDest, mode);
        }
    }

    const commitMoveOrCopy = async (pathDest: string) => {
        assertInitialized();
        if (!filesToMoveOrCopy) {
            throw new Error("No files selected for moving or copying");
        }
        if (operationType === "COPY") {
            await commitCopy(pathDest);
        } else if (operationType === "MOVE") {
            await commitMove(pathDest);
        } else {
            throw new Error("Unsupported operation type: " + operationType);
        }
        clearFilesToMoveOrCopy();
        sync();
    }

    const mv = async (pathSrc: string, fileNames: string[], pathDest: string) => {
        assertInitialized();
        const mode = await askOperationModeIfNeeded(pathDest, fileNames);
        if (fileNames.length === 0) {
            throw new Error("No files selected for moving");
        }
        const relatedFileNames = fileNames.map(fileName => getRelevantSystemFiles(fileName, pathSrc));
        await driveClient!.mv(pathSrc, [...fileNames, ...relatedFileNames.flat()], pathDest, mode);
        sync();
    }

    const rename = async (pathSrc: string, pathDest: string) => {
        deactivateMobileSelectMode();
        assertInitialized();
        await driveClient!.rename(pathSrc, pathDest);
        sync();
    }

    const pwd = () => {
        return driveClient?.pwd();
    }

    const pwdWithId = (): { pathComponent: string, dirId: string }[] => {
        if (!driveClient) {
            return [];
        }
        return driveClient.pwdWithId();
    }

    const uploadFile = async (file: File, path: string, progressCallback?: ProgressCallback, mode?: FsOperationNameConflictMode, abortSignal?: AbortSignal): Promise<string> => {
        assertInitialized();
        if (!mode) {
            mode = await askOperationModeIfNeeded(path, [file.name]);
        }
        if (abortSignal?.aborted) throw new OperationCancelledError();
        const uploadStartedCallback = () => {
            sync();
        };
        const fileId = await driveClient!.uploadFile(file, path, mode, uploadStartedCallback, progressCallback, abortSignal);
        sync();
        return fileId;
    }

    const isOpenAvailable = (fileObjects: FileProperties[]) => {
        if (fileObjects.length !== 1) {
            return false;
        }
        if (fileObjects[0].type === FsObjectType.DIR || openableExtensions.includes(fileObjects[0].extension!)) {
            return true;
        }
        return false;
    }

    const isDownloadAvailable = (fileObjects: FileProperties[]) => {
        if (fileObjects.length !== 1) {
            return false;
        }
        if (fileObjects[0].type === FsObjectType.DIR) {
            return false;
        }
        return true;
    }

    const isSelectedObjectOpenAvailable = () => {
        const selectedFileObjects = useFilesStore.getState().fileObjects.filter(e => e.selected);
        return isOpenAvailable(selectedFileObjects);
    }

    const isSelectedObjectDownloadAvailable = () => {
        const selectedFileObjects = useFilesStore.getState().fileObjects.filter(e => e.selected);
        return isDownloadAvailable(selectedFileObjects);
    }

    const getFileData = async (fileProps: FileProperties, cache = false) => {
        fileProps.contentHash = "--";
        if (driveClient == null) {
            throw new Error("Uninitialized");
        }
        if (fileProps.byteOffset == null || fileProps.byteLength == null || fileProps.contentHash == null) {
            throw new Error("Failed to download file: byteOffset, byteLength or contentHash missing");
        }
        return driveClient.getFileData(fileProps.byteOffset, fileProps.byteLength, fileProps.contentHash!, cache);
    }

    const downloadFile = async (fileProps: FileProperties, cache = false) => {
        assertInitialized();
        const fileData = await getFileData(fileProps, cache);
        saveFileToDisk(fileData, fileProps.name);
    }

    const downloadObject = async (fileObject: FileProperties) => {
        if (!isDownloadAvailable([fileObject])) {
            throw new Error("Operation not supported for selected objects");
        }
        await downloadFile(fileObject);
    }

    const openObject = (fileObject: FileProperties) => {
        if (!isOpenAvailable([fileObject])) {
            throw new Error("Operation not supported for selected objects");
        }
        if (fileObject.type === FsObjectType.DIR) {
            navigateDir(fileObject.id);
        } else if (imageExtensions.includes(fileObject.extension!) || playableVideoExtensions.includes(fileObject.extension!)) {
            navigateDir(fileObject.id);
        } else {
            throw new Error("Operation declared supported, but not implemented");
        }
    }

    const downloadSelectedObject = () => {
        const selectedFileObjects = useFilesStore.getState().fileObjects.filter(e => e.selected);
        downloadObject(selectedFileObjects[0]);
    }

    const openSelectedObject = () => {
        const selectedFileObjects = useFilesStore.getState().fileObjects.filter(e => e.selected);
        openObject(selectedFileObjects[0]);
    }

    const closeSelectedObject = () => {
        const selectedFileObjects = useFilesStore.getState().fileObjects.filter(e => e.selected);
        if (selectedFileObjects.length < 1) {
            throw new Error("No objects selected");
        }
        const currentObject = selectedFileObjects[0].id;
        const selectedNode = driveClient?.getNodeById(currentObject);
        const parentNode = selectedNode?.getParentNode();
        navigateDir(parentNode!.id);
    }

    const getDriveDescription = () => {
        assertInitialized();
        return driveClient!.getDescription();
    }

    const setDriveDescription = async (description: string) => {
        assertInitialized();
        return driveClient!.setDescription(description);
    }

    return {
        pwd,
        pwdWithId,
        sync,
        refresh,
        initialize,
        cd,
        cdByDirId,
        mkdir,
        rm,
        selectFilesToCopy,
        commitMoveOrCopy,
        mv,
        rename,
        selectFilesToMove,
        uploadFile,
        getFileData,
        isOpenAvailable,
        isDownloadAvailable,
        isSelectedObjectOpenAvailable,
        isSelectedObjectDownloadAvailable,
        downloadSelectedObject,
        openSelectedObject,
        openObject,
        downloadObject,
        closeSelectedObject,
        getDriveDescription,
        setDriveDescription
    };
}