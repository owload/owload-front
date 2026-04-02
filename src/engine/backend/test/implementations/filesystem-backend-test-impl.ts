import { CachingFilesystemBackend } from "../../caching-filesystem-backend";
import { RestDriveBackend } from "../../drive-backend";
import { PreloadingFilesystemBackend } from "../../preloading-filesystem-backend";
import { RestFilesystemBackend } from "../../rest-filesystem-backend";
import { MockDriveBackend } from "../mocks/drive-backend.mock";
import { MockFilesystemBackend } from "../mocks/filesystem.mock";


export async function getFilesystemBackend() {
    switch (import.meta.env.TEST_API_MODE) {
        case "REST":
            return getRestFilesystemBackend();
        case "MOCK":
        default:
            return getMockFilesystemBackend();
    }
}

async function getRestFilesystemBackend() {
    const driveBackend = new RestDriveBackend();
    const filesystemBackend = new RestFilesystemBackend();
    const cachingFilesystemBackend = new CachingFilesystemBackend(filesystemBackend);
    const preloadingFilesystemBackend = new PreloadingFilesystemBackend(cachingFilesystemBackend);
    const driveInfo = await driveBackend.createDrive("Test drive");
    await cachingFilesystemBackend.clearCache(driveInfo.id);
    return { filesystemBackend: preloadingFilesystemBackend, driveInfo };
}

async function getMockFilesystemBackend() {
    const driveBackend = new MockDriveBackend();
    const filesystemBackend = new MockFilesystemBackend(driveBackend);
    const cachingFilesystemBackend = new CachingFilesystemBackend(filesystemBackend);
    const preloadingFilesystemBackend = new PreloadingFilesystemBackend(cachingFilesystemBackend);
    const driveInfo = await driveBackend.createDrive("Test drive");
    await cachingFilesystemBackend.clearCache(driveInfo.id);
    return { filesystemBackend: preloadingFilesystemBackend, driveInfo };
}
