import { describe, expect, test } from 'vitest';
import type { EditorExtension } from '@owload/editor-sdk';
import { buildRegistry, fileExtensionOf } from '../registry-core';

const make = (over: Partial<EditorExtension> = {}): EditorExtension => ({
  apiVersion: 1,
  id: 'one',
  label: 'One',
  fileExtensions: ['one'],
  load: async () => ({ default: () => null }),
  ...over,
});

describe('fileExtensionOf', () => {
  test.each([
    ['a.txt', 'txt'],
    ['Report.XLSX', 'xlsx'],
    ['archive.tar.gz', 'gz'],
    ['noextension', ''],
    ['.hidden', 'hidden'],
    ['trailing.', ''],
  ])('%s -> "%s"', (name, ext) => {
    expect(fileExtensionOf(name)).toBe(ext);
  });
});

describe('buildRegistry', () => {
  test('finds the editor by file name, ignoring case, and by id', () => {
    const one = { extension: make() };
    const two = { extension: make({ id: 'two', fileExtensions: ['two', 'too'] }) };
    const r = buildRegistry([one, two]);
    expect(r.forFileName('A.ONE')).toBe(one);
    expect(r.forFileName('x.too')).toBe(two);
    expect(r.forFileName('x.pdf')).toBeUndefined();
    expect(r.forFileName('noextension')).toBeUndefined();
    expect(r.byId('two')).toBe(two);
    expect(r.fileExtensions()).toEqual(['one', 'two', 'too']);
  });

  test('lists only the extensions that offer "New …"', () => {
    const withNew = { extension: make({ createNew: { label: 'one file', defaultExtension: 'one' } }) };
    const without = { extension: make({ id: 'two', fileExtensions: ['two'] }) };
    expect(buildRegistry([withNew, without]).creatable()).toEqual([withNew]);
  });

  test('stops start-up with the problems of an invalid descriptor', () => {
    expect(() => buildRegistry([{ extension: make({ id: 'Bad Id', fileExtensions: [] }) }])).toThrow(/Invalid editor extension "Bad Id".*id must.*fileExtensions must/);
  });

  test('rejects a descriptor of another contract version with a clear message', () => {
    const future = { ...make(), apiVersion: 2 } as unknown as EditorExtension;
    expect(() => buildRegistry([{ extension: future }])).toThrow(/Unsupported apiVersion 2/);
  });

  test('refuses two extensions with the same id or the same file extension', () => {
    expect(() => buildRegistry([{ extension: make() }, { extension: make({ fileExtensions: ['other'] }) }])).toThrow(/same|id "one"/);
    expect(() => buildRegistry([{ extension: make() }, { extension: make({ id: 'two' }) }])).toThrow(/".one" is claimed by both "one" and "two"/);
  });
});
