import { describe, expect, test } from 'vitest';
import { registry } from '../registry';

// The real list: its descriptors must pass the validation that runs at start-up.
describe('the registry of the client', () => {
  test('knows the text and spreadsheet editors and the HEIC viewer', () => {
    expect(registry.all().map((e) => e.extension.id).sort()).toEqual(['heic', 'text', 'xlsx']);
    expect(registry.forFileName('photo.HEIC')?.extension.id).toBe('heic');
    expect(registry.forFileName('notes.txt')?.extension.id).toBe('text');
    expect(registry.forFileName('Budget.XLSX')?.extension.id).toBe('xlsx');
  });

  test('offers "New text file" and "New spreadsheet"', () => {
    expect(registry.creatable().map((e) => e.extension.createNew!.label).sort()).toEqual(['spreadsheet', 'text file']);
  });
});
