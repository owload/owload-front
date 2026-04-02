import { PkiBackend } from "../backend/pki-backend";
import { UserId } from "../backend/user-backend";


export class PkiService {
  private readonly pkiBackend: PkiBackend;

  constructor(pkiBackend: PkiBackend) {
    this.pkiBackend = pkiBackend;
  }

  public async getUserPublicKey(userId: UserId): Promise<{ userId: UserId; publicKeyBase64: string } | null> {
    const publicKeysArray = await this.pkiBackend.getUsersPublicKeys([userId]);
    if (publicKeysArray.length === 0) {
      return null;
    }
    return publicKeysArray[0];
  }

  public async getTsaPublicKey(tsaId: string): Promise<{ tsaId: string; publicKeyBase64: string } | null> {
    const publicKeysArray = await this.pkiBackend.getTsaPublicKeys([tsaId]);
    if (publicKeysArray.length === 0) {
      return null;
    }
    return publicKeysArray[0];
  }

  public async registerUserRsaKeys(publicKeyBase64: string, privateKeyBase64: string): Promise<void> {
    return this.pkiBackend.registerUserRsaKeys(publicKeyBase64, privateKeyBase64);
  }

  public async getUserRsaKeys(): Promise<{ userId: UserId; publicKeyBase64: string, privateKeyBase64: string }[]> {
    return this.pkiBackend.getUserRsaKeys();
  }
}
