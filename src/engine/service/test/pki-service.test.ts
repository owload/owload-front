import PkiBackendTestImpl from "@/engine/backend/test/implementations/pki-backend-test-impl";
import { getTsaBackend } from "@/engine/backend/test/implementations/tsa-backend-test-impl";
import UserBackendTestImpl from "@/engine/backend/test/implementations/user-backend-test-impl";
import { getTestUserId } from "@/engine/backend/test/mocks/test-user-info";
import { test, expect } from "vitest";
import { PkiService } from "../pki-service";



test('Subsequent queries with same tsaIds', async () => {
  const pkiBackend = new PkiBackendTestImpl();
  const tsaBackend = await getTsaBackend();
  const pkiService = new PkiService(pkiBackend);

  const messageHash = 'EsVs/NwCSQAsKksff9lXxxSfxF0OmSBZTHx4wX3MNL0=';
  const result = await tsaBackend.getTimestamp(messageHash);
  expect(result.tsaId).toBeTypeOf('string');
  const tsaId = result.tsaId;

  const publicKey1_1 = await pkiService.getTsaPublicKey(tsaId);
  const publicKey1_2 = await pkiService.getTsaPublicKey(tsaId);
  expect(publicKey1_1).to.not.be.null;
  expect(publicKey1_2).to.not.be.null;
  expect(publicKey1_1!.tsaId).toBeTypeOf('string');
  expect(publicKey1_1!.publicKeyBase64).toBeTypeOf('string');
  expect(publicKey1_2!.tsaId).toBeTypeOf('string');
  expect(publicKey1_2!.publicKeyBase64).toBeTypeOf('string');
});

test('Query public key of a non-registered userId returns null', async () => {
  const pkiBackend = new PkiBackendTestImpl();
  const pkiService = new PkiService(pkiBackend);
  const emptyPublicKey = await pkiService.getUserPublicKey("non-existing-user-id");
  expect(emptyPublicKey).toBe(null);
});

test('Subsequent queries with same userIds', async () => {
  const pkiBackend = new PkiBackendTestImpl();
  const userBackend = new UserBackendTestImpl();
  const pkiService = new PkiService(pkiBackend);
  const userId = getTestUserId();

  const alice = (await userBackend.findUsers("alice@example.com"))[0];
  const publicKey1_1 = await pkiService.getUserPublicKey(userId);
  const publicKey1_2 = await pkiService.getUserPublicKey(userId);
  const publicKey2_1 = await pkiService.getUserPublicKey(alice.userId);
  const publicKey2_2 = await pkiService.getUserPublicKey(alice.userId);
  const publicKey2_3 = await pkiService.getUserPublicKey(alice.userId);
  const testUserKeys = (await pkiService.getUserRsaKeys())[0];
  expect(publicKey1_1).toEqual({ userId: userId, publicKeyBase64: testUserKeys.publicKeyBase64 });
  expect(publicKey1_2).toEqual(publicKey1_1);
  expect(publicKey2_1).to.not.be.null;
  expect(publicKey2_1!.userId).toBe(alice.userId);
  expect(publicKey2_1!.publicKeyBase64).toBeTypeOf('string');
  expect(publicKey2_2).toEqual(publicKey2_1);
  expect(publicKey2_3).toEqual(publicKey2_1);
});
