import { describe, expect, it } from "vitest";
import { isExtensionPhoto, photoSizeForScreen } from "../extension-photo";

describe("isExtensionPhoto", () => {
    it("is true for the photos an extension decodes, whatever the case", () => {
        expect(isExtensionPhoto("IMG_0001.HEIC")).toBe(true);
        expect(isExtensionPhoto("holiday.heif")).toBe(true);
        expect(isExtensionPhoto("a.b.c.heic")).toBe(true);
    });

    it("is false for what the browser shows itself, for other documents and for names without an extension", () => {
        expect(isExtensionPhoto("a.jpg")).toBe(false);
        expect(isExtensionPhoto("notes.txt")).toBe(false);
        expect(isExtensionPhoto("heic")).toBe(false);
        expect(isExtensionPhoto("")).toBe(false);
    });
});

describe("photoSizeForScreen", () => {
    it("fills the screen, between a least and a most", () => {
        expect(photoSizeForScreen(1440, 2)).toBe(2880);
        expect(photoSizeForScreen(1920, 1)).toBe(1920);
        expect(photoSizeForScreen(800, 1)).toBe(1280);
        expect(photoSizeForScreen(3840, 2)).toBe(3072);
        expect(photoSizeForScreen(0, 0)).toBe(1280);
    });
});
