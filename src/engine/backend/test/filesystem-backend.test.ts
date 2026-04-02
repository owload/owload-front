import { checkEqual } from '../../core/stream-utils';

import { expect, test } from 'vitest';
import { getFilesystemBackend } from './implementations/filesystem-backend-test-impl';


test('Empty filesystem backend returns zero-length result', async () => {
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  const opsU8array = await filesystemBackend.getOperations(driveInfo.id, 0);
  expect(opsU8array).toBeInstanceOf(Uint8Array);
  expect(opsU8array.length).toBe(0);
});

test('getOperations with non-existing driveId causes to throw an error', async () => {
  const { filesystemBackend } = await getFilesystemBackend();
  const nonExistingContainerId = '8383923-2940-2';
  await expect(async () => filesystemBackend.getOperations(nonExistingContainerId, 0)).rejects.toThrowError();
});

test('Save one operation then get it', async () => {
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  const op1Data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  await filesystemBackend.saveOperation(driveInfo.id, op1Data);
  const opsU8array = await filesystemBackend.getOperations(driveInfo.id, 0);
  expect(checkEqual(opsU8array, op1Data)).toBe(true);
});

test('saveOperation with non-existing containerId throws an error', async () => {
  const { filesystemBackend } = await getFilesystemBackend();
  const nonExistingContainerId = '8383923-2940-32';
  await expect(async () => filesystemBackend.saveOperation(nonExistingContainerId, new Uint8Array(1))).rejects.toThrowError();
});

test('getOperations with negative pos throws an error', async () => {
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  await expect(async () => filesystemBackend.getOperations(driveInfo.id, -34)).rejects.toThrowError();
});

test('getOperations: when startBytePos greater than max available, then return empty', async () => {
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  const op1Data = new Uint8Array([1, 2, 3, 4]);
  await filesystemBackend.saveOperation(driveInfo.id, op1Data);
  const opsU8array = await filesystemBackend.getOperations(driveInfo.id, 100);
  expect(checkEqual(opsU8array, new Uint8Array([]))).toBe(true);
});

test("Empty save request doesn't affect data", async () => {
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  const emptyData = new Uint8Array([]);
  await filesystemBackend.saveOperation(driveInfo.id, emptyData);
  await filesystemBackend.saveOperation(driveInfo.id, emptyData);
  let opsU8array = await filesystemBackend.getOperations(driveInfo.id, 0);
  expect(checkEqual(opsU8array, emptyData)).toBe(true);
  const nonEmptyData = new Uint8Array([1, 2, 3]);
  await filesystemBackend.saveOperation(driveInfo.id, nonEmptyData);
  await filesystemBackend.saveOperation(driveInfo.id, emptyData);
  opsU8array = await filesystemBackend.getOperations(driveInfo.id, 0);
  expect(checkEqual(opsU8array, nonEmptyData)).toBe(true);
});

test('Simultaneously save and then get ops with one backend', async () => {
  const N = 50;
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  const promises = [];
  const opData = new Uint8Array([1, 2, 3]);
  for (let i = 0; i < N; i++) {
    promises.push(filesystemBackend.saveOperation(driveInfo.id, opData));
  }
  await Promise.all(promises);
  const opsU8array = await filesystemBackend.getOperations(driveInfo.id, 0);
  expect(opsU8array.length).toBe(N * opData.length);
});


test('Start and finish session', async () => {
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  const sessionInfo = await filesystemBackend.startUploadSession(driveInfo.id, 100);
  await filesystemBackend.finishUploadSession(sessionInfo.sessionId);
});



test('Save multiple operations then and them in multiple queries', async () => {
  const { filesystemBackend, driveInfo } = await getFilesystemBackend();
  await filesystemBackend.saveOperation(driveInfo.id, new Uint8Array([1, 2, 3]));
  await filesystemBackend.saveOperation(driveInfo.id, new Uint8Array([4, 5]));
  let opsU8array = await filesystemBackend.getOperations(driveInfo.id, 0);
  expect(checkEqual(opsU8array, new Uint8Array([1, 2, 3, 4, 5]))).toBe(true);
  opsU8array = await filesystemBackend.getOperations(driveInfo.id, 1);
  expect(checkEqual(opsU8array, new Uint8Array([2, 3, 4, 5]))).toBe(true);
  opsU8array = await filesystemBackend.getOperations(driveInfo.id, 2);
  expect(checkEqual(opsU8array, new Uint8Array([3, 4, 5]))).toBe(true);
  opsU8array = await filesystemBackend.getOperations(driveInfo.id, 4);
  expect(checkEqual(opsU8array, new Uint8Array([5]))).toBe(true);
  await filesystemBackend.saveOperation(driveInfo.id, new Uint8Array([6, 7]));
  opsU8array = await filesystemBackend.getOperations(driveInfo.id, 4);
  expect(checkEqual(opsU8array, new Uint8Array([5, 6, 7]))).toBe(true);
});

//
// todo
// test('Start session, write data, finish session, then read', async () => {
//   const [fileSystemBackend, driveInfo] = await getFilesystemBackend();
//   const sessionInfo = await fileSystemBackend.startUploadSession(driveInfo.id, 100);
//   const message1 = "Hello and one more time bonjour, my dear friend!";
//   const message2 = " It's good to see you again. Isn't it?";
//   const encoder = new TextEncoder();
//   const message1Data = encoder.encode(message1);
//   const message2Data = encoder.encode(message2);
//   await fileSystemBackend.saveDataBlock(sessionInfo.sessionId, message1Data, 0);
//   await fileSystemBackend.saveDataBlock(sessionInfo.sessionId, message2Data, message1Data.byteLength);
//   await fileSystemBackend.finishUploadSession(sessionInfo.sessionId);
//   const retrievedData = await fileSystemBackend.getDataBlock(driveInfo.id, 0, message1Data.length + message2Data.length);
//   const retrievedString = (new TextDecoder()).decode(retrievedData);
//   expect(retrievedString).toBe(message1 + message2);
// });

// TODO: more tests on read-write data
