import { expect, test } from 'vitest';
import { getTsaService } from './implementations/tsa-service-test-impl';

const testMessageHash = 'EsVs/NwCSQAsKksff9lXxxSfxF0OmSBZTHx4wX3MNL0=';
const testMessageHash2 = 'MMsVs/NwCSQAsKksff9lXffSfxF0OmSBZTHx4wX5MNL0=';

test('Tsa service returns tsaId, timestamp and signature for getTimestamp method', async () => {
  const tsaService = await getTsaService();
  const result = await tsaService.getTimestamp(testMessageHash);
  expect(result.tsaId).toBeTypeOf('string');
  expect(result.timestamp).toBeTypeOf('number');
  expect(result.signature).toBeTypeOf('string');
});

test('Get timestamp, then verify signature', async () => {
  const tsaService = await getTsaService();
  const { tsaId, timestamp, signature } = await tsaService.getTimestamp(testMessageHash);
  const verificationResult = await tsaService.verifyTimestamp(testMessageHash, timestamp, signature, tsaId);
  expect(verificationResult).toBe(true);
});

test('Get timestamp, then verify signature for two messages', async () => {
  const tsaService = await getTsaService();
  const ts1 = await tsaService.getTimestamp(testMessageHash);
  const ts2 = await tsaService.getTimestamp(testMessageHash2);
  const verificationResult = await tsaService.verifyTimestamp(testMessageHash, ts1.timestamp, ts1.signature, ts1.tsaId);
  expect(verificationResult).toBe(true);
  const verificationResult2 = await tsaService.verifyTimestamp(testMessageHash2, ts2.timestamp, ts2.signature, ts2.tsaId);
  expect(verificationResult2).toBe(true);
});

test('Get timestamp, then tamper timestamp, then try to verify signature', async () => {
  const tsaService = await getTsaService();
  const { tsaId, timestamp, signature } = await tsaService.getTimestamp(testMessageHash);
  const verificationResult = await tsaService.verifyTimestamp(testMessageHash, timestamp + 1, signature, tsaId);
  expect(verificationResult).toBe(false);
});

test('Try to verify signature with non-existing tsaId throws an exception', async () => {
  const tsaService = await getTsaService();
  const { tsaId, timestamp, signature } = await tsaService.getTimestamp(testMessageHash);
  expect(async () =>
    tsaService.verifyTimestamp(testMessageHash, timestamp + 1, signature, tsaId + '_')
  ).rejects.toThrowError();
});
