import { getApiCall } from "../api/api";

export abstract class TsaBackend {
  public abstract getTimestamp(
    messageHash: string
  ): Promise<{ tsaId: string; timestamp: number; signature: string }>;
}

export class RestTsaBackend implements TsaBackend {
  async getTimestamp(messageHash: string): Promise<{ tsaId: string; timestamp: number; signature: string }> {
    return getApiCall(`/tsa/timestamp?messageHash=${btoa(messageHash)}`);
  }
}