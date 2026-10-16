import { PhotoCache } from "@/lib/photo-cache";

/** The videos of the last few Live Photos looked at, kept as addresses so that playing one again is instant. A few megabytes each at most. */
const cache = new PhotoCache(3, (url) => URL.revokeObjectURL(url));

/**
 * The address of the short video of a Live Photo, read and decrypted whole (it is a second or three, a megabyte or two) and made into a blob, so
 * that it plays at once and without the streaming player. Started when the photo is opened, so it is ready by the time the button is pressed.
 */
export function loadLiveVideo(videoId: string, read: () => Promise<Uint8Array>): Promise<string> {
    return cache.get(videoId, async () => URL.createObjectURL(new Blob([(await read()) as Uint8Array<ArrayBuffer>], { type: "video/quicktime" })));
}

export function clearLiveVideos(): void {
    cache.clear();
}
