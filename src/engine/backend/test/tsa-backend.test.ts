import { expect, test } from 'vitest';
import { getTsaBackend } from './implementations/tsa-backend-test-impl';
import PkiBackendTestImpl from './implementations/pki-backend-test-impl';

test('Tsa backend returns tsaId, timestamp and signature for getTimestamp method, PKI returns TSA Key', async () => {
    const tsaBackend = await getTsaBackend();
    const pkiBackend = new PkiBackendTestImpl();
    const messageHash = 'EsVs/NwCSQAsKksff9lXxxSfxF0OmSBZTHx4wX3MNL0=';
    const result = await tsaBackend.getTimestamp(messageHash);
    expect(result.tsaId).toBeTypeOf('string');
    expect(result.timestamp).toBeTypeOf('number');
    expect(result.signature).toBeTypeOf('string');
    const tsaPublicKeys = await pkiBackend.getTsaPublicKeys([result.tsaId]);
    expect(tsaPublicKeys.length).toBe(1);
    expect(tsaPublicKeys[0].tsaId).toBe(result.tsaId);
    expect(tsaPublicKeys[0].publicKeyBase64).toBeTypeOf('string');
});
