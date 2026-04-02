import { postApiCall, getApiCall } from "../api/api";
import { getCachedStringValue, setCachedValue } from "./caches";
import { UserId } from "./user-backend";


export abstract class PkiBackend {
  public abstract registerUserRsaKeys(publicKey: string, privateKey: string): Promise<void>;
  public abstract getUserRsaKeys(): Promise<{ userId: UserId; publicKeyBase64: string, privateKeyBase64: string }[]>;
  public abstract getUsersPublicKeys(userIds: UserId[]): Promise<{ userId: UserId; publicKeyBase64: string }[]>;
  public abstract getTsaPublicKeys(tsaIds: string[]): Promise<{ tsaId: string; publicKeyBase64: string }[]>;
}

export class RestPkiBackend implements PkiBackend {
  private readonly USERS_KEYS_CACHE = "USERS_KEYS_CACHE_1";
  private readonly TSA_KEYS_CACHE = "TSA_KEYS_CACHE_1";

  async getTsaPublicKeys(tsaIds: string[]): Promise<{ tsaId: string; publicKeyBase64: string }[]> {
    let cachedKeys: { tsaId: string; publicKeyBase64: string }[] = []
    let newKeys: { tsaId: string; publicKeyBase64: string }[] = [];
    const abscentKeyIds = [];
    for(let tsaId of tsaIds) {
      const publicKeyBase64 = await getCachedStringValue(this.TSA_KEYS_CACHE, tsaId);
      if(publicKeyBase64) {
        cachedKeys.push({tsaId, publicKeyBase64});
      } else {
        abscentKeyIds.push(tsaId);
      }
    }
    if(abscentKeyIds.length > 0) {
      newKeys = await postApiCall<{ tsaId: string; publicKeyBase64: string }[], string[]>(`/pki/tsakeys`, abscentKeyIds);
      for(let newKey of newKeys) {
        setCachedValue<string>(this.TSA_KEYS_CACHE, newKey.tsaId, newKey.publicKeyBase64);
      }
    }
    return [...cachedKeys, ...newKeys];
  }

  async getUsersPublicKeys(userIds: UserId[]): Promise<{ userId: UserId; publicKeyBase64: string }[]> {
    let cachedKeys: { userId: UserId; publicKeyBase64: string }[] = []
    let newKeys: { userId: UserId; publicKeyBase64: string }[] = [];
    const abscentKeyIds = [];
    for(let userId of userIds) {
      const publicKeyBase64 = await getCachedStringValue(this.USERS_KEYS_CACHE, userId);
      if(publicKeyBase64) {
        cachedKeys.push({userId, publicKeyBase64});
      } else {
        abscentKeyIds.push(userId);
      }
    }
    if(abscentKeyIds.length > 0) {
      newKeys = await postApiCall<{ userId: string; publicKeyBase64: string }[], string[]>(`/pki/byusers`, abscentKeyIds);
      for(let newKey of newKeys) {
        setCachedValue<string>(this.USERS_KEYS_CACHE, newKey.userId, newKey.publicKeyBase64);
      }
    }
    return [...cachedKeys, ...newKeys];
  }

  async getUserRsaKeys(): Promise<{ userId: UserId; publicKeyBase64: string, privateKeyBase64: string }[]> {
    return getApiCall(`/pki/userkeys`);
  }

  async registerUserRsaKeys(publicKey: string, privateKey: string): Promise<void> {
    await postApiCall(`/pki/userkeys`, { publicKey, privateKey });
  }
}
