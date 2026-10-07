/** The side, in pixels, of the square the uploaded picture is scaled to. */
const AVATAR_SIDE = 256;
// Only a guard against a file that would take long to decode: a photo from a phone is well under it.
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const AVATAR_FILE_ACCEPT = ACCEPTED_TYPES.join(",");

/**
 * Turns a photo the user picked into the small square JPEG that is uploaded: cropped to the centre and scaled down. The
 * picture is drawn again, so what the file carried besides the pixels (the place and time of the shot, for one) is not sent.
 * Rejects with a message fit to show when the file is not a PNG, JPEG or WebP, is over 25 MB, or cannot be read.
 */
export async function prepareAvatarImage(file: File): Promise<Blob> {
    if (!ACCEPTED_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG or WebP picture.");
    if (file.size > MAX_SOURCE_BYTES) throw new Error("The picture is larger than 25 MB.");

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new Error("This picture cannot be read.");
    }
    try {
        const side = Math.min(bitmap.width, bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = AVATAR_SIDE;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("This picture cannot be read.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, AVATAR_SIDE, AVATAR_SIDE);
        context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
        if (!blob) throw new Error("This picture cannot be read.");
        return blob;
    } finally {
        bitmap.close();
    }
}
