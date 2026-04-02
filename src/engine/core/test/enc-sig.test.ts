import { generateRsaKeys, importPrivateKey, importPublicKey, sign, verify } from '../enc-sig';
import { expect, test } from 'vitest';

const testMessage = 'Some message to be signed and verified';

async function generateAndImportKeys(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const { publicKeyBase64, privateKeyBase64 } = await generateRsaKeys();
  const publicKey = await importPublicKey(publicKeyBase64);
  const privateKey = await importPrivateKey(privateKeyBase64);
  return { publicKey, privateKey };
}

test('Generate, export and import asymmetric public and private keys', async () => {
  const { publicKey, privateKey } = await generateAndImportKeys();
  expect(publicKey instanceof CryptoKey).toBe(true);
  expect(privateKey instanceof CryptoKey).toBe(true);
});

test('Sign message, then verify', async () => {
  const { publicKey, privateKey } = await generateAndImportKeys();
  const signature = await sign(testMessage, privateKey);
  const verificationResult = await verify(testMessage, signature, publicKey);
  expect(verificationResult).toBe(true);
});

test('Sign message, then verify with correct and wrong keys', async () => {
  const { publicKey, privateKey } = await generateAndImportKeys();
  const signature = await sign(testMessage, privateKey);
  const wrong = await generateAndImportKeys();
  const wrongSignature = await sign(testMessage, wrong.privateKey);
  expect(await verify(testMessage, signature, publicKey)).toBe(true);
  expect(await verify(testMessage, signature, wrong.publicKey)).toBe(false);
  expect(await verify(testMessage, wrongSignature, publicKey)).toBe(false);
});

test('Sign message, then try to verify correct and tampered message', async () => {
  const tamperedMessage = 'SomeXmessage to be signed and verified';
  const { publicKey, privateKey } = await generateAndImportKeys();
  const signature = await sign(testMessage, privateKey);
  expect(await verify(testMessage, signature, publicKey)).toBe(true);
  expect(await verify(tamperedMessage, signature, publicKey)).toBe(false);
});
