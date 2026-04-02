import { generateRsaKeys } from '@/engine/core/enc-sig';
import { expect, test } from 'vitest';
import PkiBackendTestImpl from './implementations/pki-backend-test-impl';
import UserBackendTestImpl from './implementations/user-backend-test-impl';
import { getTestUserId } from './mocks/test-user-info';


test.skip('registerUserRsaKeys then getUserRsaKeys', async () => {
  const pkiBackend = new PkiBackendTestImpl();
  const { privateKeyBase64, publicKeyBase64 } = await generateRsaKeys();
  await pkiBackend.registerUserRsaKeys(publicKeyBase64, privateKeyBase64);
  const userKeys = await pkiBackend.getUserRsaKeys();
  expect(userKeys.length).toBe(1);
  expect(userKeys[0].userId).toBe(getTestUserId());
  expect(userKeys[0].privateKeyBase64).toBe(privateKeyBase64);
  expect(userKeys[0].publicKeyBase64).toBe(publicKeyBase64);
});

test('Find test user public key, compare it with result of getUserRsaKeys', async () => {
  const pkiBackend = new PkiBackendTestImpl();
  const userId = getTestUserId();

  const publicKeys = await pkiBackend.getUsersPublicKeys([userId]);
  expect(publicKeys.length).toBe(1);

  const userKeys = await pkiBackend.getUserRsaKeys();
  expect(userKeys.length).toBe(1);
  expect(publicKeys[0].userId).toBe(userId);
  expect(publicKeys[0].publicKeyBase64).toBe(userKeys[0].publicKeyBase64);
});

test('Get users public keys with empty argument returns empty array', async () => {
  const pkiBackend = new PkiBackendTestImpl();
  const publicKeys = await pkiBackend.getUsersPublicKeys([]);
  expect(publicKeys.length).toBe(0);
});

test('Find alice and bob and get their public keys in different combinations', async () => {
  const pkiBackend = new PkiBackendTestImpl();
  const userBackend = new UserBackendTestImpl();
  const alice = (await userBackend.findUsers("alice@example.com"))[0];
  const bob = (await userBackend.findUsers("bob@example.com"))[0];
  let publicKeys = await pkiBackend.getUsersPublicKeys([alice.userId, bob.userId]);
  expect(publicKeys.length).toBe(2);
  publicKeys = await pkiBackend.getUsersPublicKeys([alice.userId]);
  expect(publicKeys.length).toBe(1);
  expect(publicKeys[0].userId).toBeTypeOf('string');
  expect(publicKeys[0].publicKeyBase64).toBeTypeOf('string');
});
