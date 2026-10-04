import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { EditorExtension } from '@owload/editor-sdk';
import { hasThumbnail, needsPreviewBackfill, requestPreview } from '../preview';

// A 1x1 PNG (complete: signature, IHDR, IDAT, IEND).
const PNG_1x1 = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

const ext = (preview?: EditorExtension['preview'], over: Partial<EditorExtension> = {}): EditorExtension => ({
  apiVersion: 1,
  id: 'doc',
  label: 'Doc',
  fileExtensions: ['doc'],
  load: async () => ({ default: () => null }),
  preview,
  ...over,
});
const data = new Uint8Array([1, 2, 3]);

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); });

describe('requestPreview', () => {
  test('returns the PNG of an extension that gives a valid one, asking for the requested size', async () => {
    const preview = vi.fn(async () => PNG_1x1);
    expect(await requestPreview(ext(preview), data, { size: 360 })).toBe(PNG_1x1);
    expect(preview).toHaveBeenCalledWith(expect.any(Uint8Array), { size: 360 });
  });

  test('has no preview for an extension without one', async () => {
    expect(await requestPreview(ext(), data)).toBeNull();
  });

  test('asks the extension about an empty file too: an empty page is its call', async () => {
    const preview = vi.fn(async () => PNG_1x1);
    expect(await requestPreview(ext(preview), new Uint8Array())).toBe(PNG_1x1);
    expect(preview).toHaveBeenCalledOnce();
    expect(await requestPreview(ext(async () => null), new Uint8Array())).toBeNull();
  });

  test('has no preview when the extension has nothing to show', async () => {
    expect(await requestPreview(ext(async () => null), data)).toBeNull();
  });

  test('does not even ask for a file over the size limit of the extension', async () => {
    const preview = vi.fn(async () => PNG_1x1);
    expect(await requestPreview(ext(preview, { maxFileBytes: 2 }), data)).toBeNull();
    expect(preview).not.toHaveBeenCalled();
  });

  test('hands the extension a copy of the bytes', async () => {
    let received: Uint8Array | undefined;
    const original = new Uint8Array([9, 9, 9]);
    await requestPreview(ext(async (d) => { received = d; d[0] = 0; return null; }), original);
    expect(received).not.toBe(original);
    expect([...original]).toEqual([9, 9, 9]);
  });

  test('rejects what is not a valid PNG, is not bytes, or is too big for the size', async () => {
    expect(await requestPreview(ext(async () => new TextEncoder().encode('x'.repeat(100))), data)).toBeNull();
    expect(await requestPreview(ext(async () => 'png' as unknown as Uint8Array), data)).toBeNull();
    expect(await requestPreview(ext(async () => PNG_1x1), data, { maxBytes: 10 })).toBeNull();
    // a 1x1 PNG is fine at any size; a requested size of 0 would reject everything
    expect(await requestPreview(ext(async () => PNG_1x1), data, { size: 0 })).toBeNull();
  });

  test('gives up on an extension that takes too long', async () => {
    const never = ext(() => new Promise<never>(() => undefined));
    expect(await requestPreview(never, data, { timeoutMs: 30 })).toBeNull();
  });

  test('turns an error into "no preview" without leaking its message', async () => {
    const failing = ext(async () => { throw new Error('secret content of the document'); });
    expect(await requestPreview(failing, data)).toBeNull();
    const logged = (console.warn as ReturnType<typeof vi.fn>).mock.calls.flat().join(' ');
    expect(logged).not.toContain('secret content');
    expect(logged).toContain('Error');
  });
});

describe('needsPreviewBackfill', () => {
  const withPreview = ext(async () => PNG_1x1);
  const thumb = '$$$sy$s$stem!_thumb_360_abc';
  const file = { finished: true, byteLength: 100 };

  test('is true for a complete document without a thumbnail, when the extension can draw one', () => {
    expect(needsPreviewBackfill(withPreview, file, [{ name: 'a.doc' }], thumb)).toBe(true);
  });

  test('is false when the folder already has the thumbnail, finished or not', () => {
    expect(needsPreviewBackfill(withPreview, file, [{ name: 'a.doc' }, { name: thumb }], thumb)).toBe(false);
    expect(hasThumbnail([{ name: thumb }], thumb)).toBe(true);
    expect(hasThumbnail([{ name: 'other' }], thumb)).toBe(false);
  });

  test('is true for an empty file too', () => {
    expect(needsPreviewBackfill(withPreview, { finished: true, byteLength: 0 }, [], thumb)).toBe(true);
  });

  test('is false for an extension without a preview, an unfinished file, or one over the size limit', () => {
    expect(needsPreviewBackfill(ext(), file, [], thumb)).toBe(false);
    expect(needsPreviewBackfill(withPreview, { finished: false, byteLength: 100 }, [], thumb)).toBe(false);
    expect(needsPreviewBackfill(ext(async () => PNG_1x1, { maxFileBytes: 50 }), file, [], thumb)).toBe(false);
    expect(needsPreviewBackfill(withPreview, undefined, [], thumb)).toBe(false);
  });

  test('treats a file whose "finished" is not known as complete', () => {
    expect(needsPreviewBackfill(withPreview, { byteLength: 100 }, [], thumb)).toBe(true);
  });
});

