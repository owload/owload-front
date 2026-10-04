import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { EditorExtension } from '@owload/editor-sdk';
import { requestPreview } from '../preview';

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

  test('has no preview for an extension without one, or for empty data', async () => {
    expect(await requestPreview(ext(), data)).toBeNull();
    expect(await requestPreview(ext(async () => PNG_1x1), new Uint8Array())).toBeNull();
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
