import { TsaBackend } from "../backend/tsa-backend";
import { importPublicKey, verify } from "../core/enc-sig";
import { PkiService } from "./pki-service";


export class TsaService {
  private readonly tsaBackend: TsaBackend;
  private readonly pkiService: PkiService;

  constructor(tsaBackend: TsaBackend, pkiService: PkiService) {
    this.tsaBackend = tsaBackend;
    this.pkiService = pkiService;
  }

  public async getTimestamp(messageHash: string): Promise<{ tsaId: string; timestamp: number; signature: string }> {
    return this.tsaBackend.getTimestamp(messageHash);
  }

  public async verifyTimestamp(
    messageHash: string,
    timestamp: number,
    signature: string,
    tsaId: string
  ): Promise<boolean> {
    const tsaPublicKeyResponse = await this.pkiService.getTsaPublicKey(tsaId);
    if (tsaPublicKeyResponse == null) {
      throw new Error(`Public key of TSA server with id ${tsaId} is unknown`);
    }
    const tsaPublicKeyBase64 = tsaPublicKeyResponse.publicKeyBase64;
    const tsaPublicKey = await importPublicKey(tsaPublicKeyBase64);
    const message = this.combineMessageHashAndTimestamp(messageHash, timestamp);
    return verify(message, signature, tsaPublicKey);
  }

  private combineMessageHashAndTimestamp(messageHash: string, timestamp: number): string {
    return messageHash + '_' + timestamp.toString();
  }
}
