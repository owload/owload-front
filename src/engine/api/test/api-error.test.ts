import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, test } from 'vitest';
import { describeApiError, describeApiErrorLines, isStorageUnavailableError, readErrorDetail } from '../api-error';

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

const slave = { targetId: 't1', role: 'SLAVE', reason: 'UNREACHABLE' };
const master = { targetId: 'm1', role: 'MASTER', reason: 'UNREACHABLE' };

describe('describeApiError', () => {
  test.each([
    ['MASTER', 'UNREACHABLE', 'The main storage is not reachable or not responding.'],
    ['MASTER', 'ACCESS_DENIED', 'Access to the main storage was denied. Check its credentials in the drive settings.'],
    ['MASTER', 'BUCKET_NOT_FOUND', 'The main storage could not be found. Check its settings.'],
    ['MASTER', 'OTHER', 'The main storage returned an error.'],
    ['SLAVE', 'UNREACHABLE', 'A secondary storage is not reachable or not responding.'],
    ['SLAVE', 'ACCESS_DENIED', 'Access to a secondary storage was denied. Check its credentials in the drive settings.'],
    ['SLAVE', 'BUCKET_NOT_FOUND', 'A secondary storage could not be found. Check its settings.'],
    ['SLAVE', 'OTHER', 'A secondary storage returned an error.'],
  ])('says whether the %s storage is the problem, reason %s', (role, reason, sentence) => {
    const error = axiosError(502, { detail: storageDetail([{ targetId: 'x', role, reason }]) });
    expect(describeApiError(error)).toBe(`${sentence} Nothing was saved.`);
  });

  test('reports the main and a secondary storage separately, main first', () => {
    const error = axiosError(502, {
      detail: storageDetail([slave, { targetId: 'm', role: 'MASTER', reason: 'ACCESS_DENIED' }]),
    });
    expect(describeApiError(error)).toBe(
      'Access to the main storage was denied. Check its credentials in the drive settings. ' +
      'A secondary storage is not reachable or not responding. Nothing was saved.',
    );
  });

  test('merges several secondary storages that failed the same way', () => {
    const error = axiosError(502, { detail: storageDetail([slave, { ...slave, targetId: 't2' }]) });
    expect(describeApiError(error)).toBe('2 secondary storages are not reachable or not responding. Nothing was saved.');
    const denied = axiosError(502, {
      detail: storageDetail([
        { targetId: 'a', role: 'SLAVE', reason: 'ACCESS_DENIED' },
        { targetId: 'b', role: 'SLAVE', reason: 'ACCESS_DENIED' },
      ]),
    });
    expect(describeApiError(denied)).toContain('Access to 2 secondary storages was denied. Check their credentials');
  });

  test('never contains a storage name or any parameter, even if the server sent one', () => {
    const error = axiosError(502, {
      detail: storageDetail([
        { ...slave, label: 'Hot EU', endpoint: 'https://s3.example.com', bucket: 'my-bucket', accessKey: 'AK123' },
      ]),
    });
    const text = describeApiError(error);
    for (const secret of ['Hot EU', 's3.example.com', 'my-bucket', 'AK123', 't1']) {
      expect(text).not.toContain(secret);
    }
    expect(text).not.toMatch(/master|slave/i);
  });

  test('warns that data may remain when the rollback did not finish', () => {
    const error = axiosError(502, { detail: storageDetail([slave], false) });
    const text = describeApiError(error);
    expect(text).toContain('Part of the data may have been left');
    expect(text).not.toContain('Nothing was saved.');
  });

  test('reads an error body delivered as an ArrayBuffer (data-block uploads)', () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ detail: storageDetail([master]) }));
    const error = axiosError(502, bytes.buffer);
    expect(isStorageUnavailableError(error)).toBe(true);
    expect(describeApiError(error)).toContain('The main storage');
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

  test('copes with an empty or unknown-role target list', () => {
    expect(describeApiError(axiosError(502, { detail: storageDetail([]) }))).toBe(
      'A storage of this drive is not available. Nothing was saved.',
    );
    expect(describeApiError(axiosError(502, { detail: storageDetail([{ targetId: 'x', role: '', reason: 'OTHER' }]) }))).toContain(
      'A storage returned an error.',
    );
  });
});

describe('describeApiErrorLines', () => {
  test('gives one sentence per line, and joins into describeApiError', () => {
    const error = axiosError(502, {
      detail: storageDetail([{ targetId: 'm', role: 'MASTER', reason: 'ACCESS_DENIED' }, slave]),
    });
    expect(describeApiErrorLines(error)).toEqual([
      'Access to the main storage was denied. Check its credentials in the drive settings.',
      'A secondary storage is not reachable or not responding.',
      'Nothing was saved.',
    ]);
    expect(describeApiError(error)).toBe(describeApiErrorLines(error).join(' '));
  });

  test('a single line for plain errors', () => {
    expect(describeApiErrorLines(axiosError(null))).toHaveLength(1);
    expect(describeApiErrorLines(new Error('x'), 'Upload failed.')).toEqual(['Upload failed.']);
  });
});

describe('readErrorDetail / isStorageUnavailableError', () => {
  test('are safe on values that are not axios errors', () => {
    expect(readErrorDetail(new Error('x'))).toBeUndefined();
    expect(isStorageUnavailableError(null)).toBe(false);
    expect(isStorageUnavailableError(axiosError(502, { detail: 'Bad gateway' }))).toBe(false);
  });
});
