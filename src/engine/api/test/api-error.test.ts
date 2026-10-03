import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, test } from 'vitest';
import { describeApiError, isStorageUnavailableError, readErrorDetail } from '../api-error';

function axiosError(status: number | null, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = status === null ? undefined : { status, statusText: '', headers: {}, config, data };
  return new AxiosError('Request failed', status === null ? 'ERR_NETWORK' : 'ERR_BAD_RESPONSE', config, undefined, response);
}

function storageDetail(targets: object[], rolledBack = true) {
  return {
    code: 'STORAGE_TARGETS_UNAVAILABLE',
    message: 'The data could not be saved because a storage of this drive is not available.',
    targets,
    rolledBack,
  };
}

const slave = { targetId: 't1', role: 'SLAVE', label: 'Hot EU', reason: 'UNREACHABLE' };

describe('describeApiError', () => {
  test.each([
    ['UNREACHABLE', 'Storage "Hot EU" (secondary) is not reachable or not responding.'],
    ['ACCESS_DENIED', 'Access to storage "Hot EU" (secondary) was denied. Check its credentials in the drive settings.'],
    ['BUCKET_NOT_FOUND', 'The bucket of storage "Hot EU" (secondary) was not found. Check its settings.'],
    ['OTHER', 'Storage "Hot EU" (secondary) returned an error.'],
  ])('names the storage and explains reason %s', (reason, sentence) => {
    const error = axiosError(502, { detail: storageDetail([{ ...slave, reason }]) });
    expect(describeApiError(error)).toBe(`${sentence} Nothing was saved.`);
  });

  test('lists every failed storage and uses the user-facing role words', () => {
    const error = axiosError(502, {
      detail: storageDetail([
        { targetId: 'm', role: 'MASTER', label: 'Archive', reason: 'ACCESS_DENIED' },
        slave,
      ]),
    });
    const text = describeApiError(error);
    expect(text).toContain('Access to storage "Archive" (main) was denied.');
    expect(text).toContain('Storage "Hot EU" (secondary) is not reachable');
    expect(text).not.toMatch(/master|slave/i);
  });

  test('warns that data may remain when the rollback did not finish', () => {
    const error = axiosError(502, { detail: storageDetail([slave], false) });
    const text = describeApiError(error);
    expect(text).toContain('Part of the data may have been left');
    expect(text).not.toContain('Nothing was saved.');
  });

  test('reads an error body delivered as an ArrayBuffer (data-block uploads)', () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ detail: storageDetail([slave]) }));
    const error = axiosError(502, bytes.buffer);
    expect(isStorageUnavailableError(error)).toBe(true);
    expect(describeApiError(error)).toContain('Hot EU');
  });

  test('reads an error body delivered as a JSON string', () => {
    const error = axiosError(502, JSON.stringify({ detail: storageDetail([slave]) }));
    expect(isStorageUnavailableError(error)).toBe(true);
  });

  test('uses a plain string detail from the server', () => {
    expect(describeApiError(axiosError(400, { detail: 'Write is out of the session\'s reserved range' }))).toBe(
      'Write is out of the session\'s reserved range',
    );
  });

  test('explains a network error without a response', () => {
    expect(describeApiError(axiosError(null))).toMatch(/Cannot reach the server/);
  });

  test.each([
    ['an unrelated object', { detail: { code: 'SOMETHING_ELSE' } }],
    ['an unparsable body', '<html>Bad gateway</html>'],
    ['no body', undefined],
  ])('falls back to the generic message for %s', (_name, data) => {
    expect(describeApiError(axiosError(500, data), 'Upload failed.')).toBe('Upload failed.');
  });

  test('falls back for a non-axios error and never dumps an object', () => {
    expect(describeApiError(new Error('boom'), 'Upload failed.')).toBe('Upload failed.');
    expect(describeApiError({ some: 'object' }, 'Upload failed.')).toBe('Upload failed.');
    expect(describeApiError(undefined)).toBe('The operation failed.');
  });

  test('tolerates a target without a label', () => {
    const error = axiosError(502, { detail: storageDetail([{ targetId: 't', role: 'SLAVE', reason: 'UNREACHABLE' }]) });
    expect(describeApiError(error)).toContain('Storage "Storage" (secondary)');
  });
});

describe('readErrorDetail / isStorageUnavailableError', () => {
  test('are safe on values that are not axios errors', () => {
    expect(readErrorDetail(new Error('x'))).toBeUndefined();
    expect(isStorageUnavailableError(null)).toBe(false);
    expect(isStorageUnavailableError(axiosError(502, { detail: 'Bad gateway' }))).toBe(false);
  });
});
