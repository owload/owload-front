import { describe, expect, test } from 'vitest';
import { LOSSY_SAVE_NOTICE, newSpreadsheetFileName } from '../spreadsheet-messages';

describe('newSpreadsheetFileName', () => {
  test('adds the .xlsx extension when it is missing', () => {
    expect(newSpreadsheetFileName('Budget', [])).toEqual({ name: 'Budget.xlsx' });
    expect(newSpreadsheetFileName('  Budget  ', [])).toEqual({ name: 'Budget.xlsx' });
  });

  test('keeps an extension that is already there, whatever its case', () => {
    expect(newSpreadsheetFileName('Budget.xlsx', [])).toEqual({ name: 'Budget.xlsx' });
    expect(newSpreadsheetFileName('Budget.XLSX', [])).toEqual({ name: 'Budget.XLSX' });
  });

  test('refuses an empty name or one that is only the extension', () => {
    expect(newSpreadsheetFileName('   ', []).error).toBeTruthy();
    expect(newSpreadsheetFileName('.xlsx', []).error).toBeTruthy();
  });

  test('refuses path separators', () => {
    expect(newSpreadsheetFileName('a/b', []).error).toBeTruthy();
    expect(newSpreadsheetFileName('a\\b', []).error).toBeTruthy();
  });

  test('refuses a name that is taken in the folder, ignoring case, because a first save would replace that file', () => {
    expect(newSpreadsheetFileName('budget', ['Budget.xlsx']).error).toMatch(/already exists/);
    expect(newSpreadsheetFileName('Budget.xlsx', ['other.txt']).name).toBe('Budget.xlsx');
  });
});

describe('LOSSY_SAVE_NOTICE', () => {
  test('says that content is dropped and where the previous version is', () => {
    expect(LOSSY_SAVE_NOTICE).toMatch(/dropped/);
    expect(LOSSY_SAVE_NOTICE).toMatch(/previous version/);
  });
});
