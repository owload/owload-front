import { describe, expect, test } from 'vitest';
import type { FoundDrive, RestoreResult } from '@/engine/backend/drive-backend';
import { describeRestoreResult, foundDriveLabel, restoreBlockedHint, shortDriveId } from '../restore-messages';

const drive = (over: Partial<FoundDrive> = {}): FoundDrive => ({
  driveId: '0b6d7e1c-1111-2222-3333-444455556666',
  title: 'Photos',
  createdTimestamp: 1,
  opsBytes: 10,
  status: 'RESTORABLE',
  reason: null,
  ...over,
});

describe('restoreBlockedHint', () => {
  test('a restorable drive can be selected', () => {
    expect(restoreBlockedHint(drive())).toBeNull();
  });

  test('a drive already in the system points to adding the storage to that drive, and says nothing about its owner', () => {
    const hint = restoreBlockedHint(drive({ status: 'ALREADY_EXISTS' }));
    expect(hint).toContain('secondary storage');
    expect(hint).not.toMatch(/owner|user|account/i);
  });

  test.each(['META_MISSING', 'META_INVALID', 'OPS_GAP', 'OPS_CORRUPT', 'OPS_TOO_LARGE'])('explains damage %s', (reason) => {
    const hint = restoreBlockedHint(drive({ status: 'DAMAGED', reason }));
    expect(hint).toBeTruthy();
    expect(hint).not.toContain(reason);
  });

  test('an unknown damage reason still gets a sentence', () => {
    expect(restoreBlockedHint(drive({ status: 'DAMAGED', reason: 'SOMETHING_NEW' }))).toBe('It is damaged and cannot be restored.');
  });
});

describe('labels', () => {
  test('a drive without a readable title is called unnamed', () => {
    expect(foundDriveLabel(drive({ title: null }))).toBe('Unnamed drive');
    expect(foundDriveLabel(drive({ title: '  ' }))).toBe('Unnamed drive');
    expect(foundDriveLabel(drive())).toBe('Photos');
  });

  test('the short id is the first eight characters', () => {
    expect(shortDriveId('0b6d7e1c-1111-2222-3333-444455556666')).toBe('0b6d7e1c');
  });
});

describe('describeRestoreResult', () => {
  const result = (status: RestoreResult['status'], reason: string | null = null): RestoreResult => ({ driveId: 'x', status, reason });

  test('only RESTORED is a success', () => {
    expect(describeRestoreResult(result('RESTORED'))).toEqual({ ok: true, text: 'Restored.' });
    for (const status of ['ALREADY_EXISTS', 'DAMAGED', 'NOT_FOUND', 'FAILED'] as const) {
      expect(describeRestoreResult(result(status)).ok).toBe(false);
    }
  });

  test('says why a storage failure happened without technical detail', () => {
    expect(describeRestoreResult(result('FAILED', 'UNREACHABLE')).text).toBe('The storage stopped responding. Try again.');
    expect(describeRestoreResult(result('FAILED', 'OTHER')).text).toBe('Restoring failed. Try again.');
    expect(describeRestoreResult(result('DAMAGED', 'OPS_GAP')).text).toContain('missing');
  });
});
