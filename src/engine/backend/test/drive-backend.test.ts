import { base64ToUint8Array } from '@/engine/core/stream-utils';
import { expect, test } from 'vitest';
import DriveBackendTestImpl from './implementations/drive-backend-test-impl';
import { getTestUserId } from './mocks/test-user-info';


test('createDrive returns driveInfo', async () => {
  const title = "My drive";
  const driveBackend = new DriveBackendTestImpl();
  const driveInfo = await driveBackend.createDrive(title);
  expect(driveInfo.id).toBeTypeOf('string');
  expect(driveInfo.ownerUserId).toBe(getTestUserId());
  //expect(driveInfo.ACL).toBeInstanceOf(Map);
  expect(driveInfo.createdTimestamp).toBeTypeOf('number');
  expect(driveInfo.title).toBe(title);
  expect(driveInfo.keyNonce).toBeTypeOf('string');
  expect(driveInfo.counterNonce).toBeTypeOf('string');
  expect(base64ToUint8Array(driveInfo.keyNonce).byteLength).toBeGreaterThan(0);
  expect(base64ToUint8Array(driveInfo.counterNonce).byteLength).toBeGreaterThan(0);
});

test('getDriveInfo with non-existing driveId throws', async () => {
  const driveBackend = new DriveBackendTestImpl();
  const nonExistingDriveId = '--2-2-2-22';
  expect(async () => driveBackend.getDriveInfo(nonExistingDriveId)).rejects.toThrowError();
});

test('getDriveInfo returns same info as createDrive', async () => {
  const driveBackend = new DriveBackendTestImpl();
  await driveBackend.createDrive("My drive");
  const driveInfoOnCreation = await driveBackend.createDrive("My drive");
  await driveBackend.createDrive("My drive"); // one more for test complexity
  const driveInfoOnRetrieval = await driveBackend.getDriveInfo(driveInfoOnCreation.id);
  expect(driveInfoOnRetrieval).toStrictEqual(driveInfoOnCreation);
});

// todo: add tests with accessible drives and acl