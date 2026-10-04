import { describe, expect, test } from 'vitest';
import type { EditorExtension } from '@owload/editor-sdk';
import { GENERIC_LOSSY_NOTE, lossyNote, maxFileBytes, newFileName, tooLargeMessage } from '../editor-host-messages';

const ext = (over: Partial<EditorExtension> = {}): EditorExtension => ({
  apiVersion: 1,
  id: 'sheet',
  label: 'Spreadsheet',
  fileExtensions: ['xlsx'],
  createNew: { label: 'spreadsheet', defaultExtension: 'xlsx' },
  load: async () => ({ default: () => null }),
  ...over,
});

describe('lossyNote', () => {
  test('names what would be dropped and where the old version is', () => {
    const note = lossyNote([{ id: 'charts', label: 'Charts' }, { id: 'images', label: 'Images' }]);
    expect(note).toBe("Saving this file here will drop: charts, images. The previous version stays in the file's history.");
  });

  test('says nothing when nothing is lost or the extension cannot tell', () => {
    expect(lossyNote([])).toBeNull();
    expect(lossyNote(null)).toBeNull();
  });

  test('falls back to a generic note when inspecting the file failed', () => {
    expect(lossyNote('unknown')).toBe(GENERIC_LOSSY_NOTE);
  });
});

describe('size limit', () => {
  test('defaults to 100 MiB and uses the extension limit when given', () => {
    expect(maxFileBytes(ext())).toBe(100 * 1024 * 1024);
    expect(maxFileBytes(ext({ maxFileBytes: 5 }))).toBe(5);
  });

  test('refuses a file over the limit with the sizes in the message, and accepts one at the limit', () => {
    const e = ext({ maxFileBytes: 10 * 1024 * 1024 });
    expect(tooLargeMessage(e, 10 * 1024 * 1024)).toBeNull();
    expect(tooLargeMessage(e, 25 * 1024 * 1024)).toBe('This file is too large to open here (25 MB; the spreadsheet editor opens files up to 10 MB).');
  });
});

describe('newFileName', () => {
  test('adds the default file extension when the name has none of the extension\'s', () => {
    expect(newFileName('Budget', ext(), [])).toEqual({ name: 'Budget.xlsx' });
    expect(newFileName('  Budget  ', ext(), [])).toEqual({ name: 'Budget.xlsx' });
    expect(newFileName('notes.v2', ext(), [])).toEqual({ name: 'notes.v2.xlsx' });
  });

  test('keeps a name that already ends in one of the extensions, whatever its case', () => {
    expect(newFileName('Budget.XLSX', ext(), [])).toEqual({ name: 'Budget.XLSX' });
    const multi = ext({ fileExtensions: ['md', 'markdown'], createNew: { label: 'note', defaultExtension: 'md' } });
    expect(newFileName('a.markdown', multi, [])).toEqual({ name: 'a.markdown' });
  });

  test('refuses an empty name, one that is only the extension, and path separators', () => {
    expect(newFileName('   ', ext(), []).error).toBeTruthy();
    expect(newFileName('.xlsx', ext(), []).error).toBeTruthy();
    expect(newFileName('a/b', ext(), []).error).toBeTruthy();
    expect(newFileName('a\\b', ext(), []).error).toBeTruthy();
  });

  test('refuses a name taken in the folder, ignoring case, because the first save would replace that file', () => {
    expect(newFileName('budget', ext(), ['Budget.xlsx']).error).toMatch(/already exists/);
    expect(newFileName('Budget', ext(), ['other.txt']).name).toBe('Budget.xlsx');
  });
});
