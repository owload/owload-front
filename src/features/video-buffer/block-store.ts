/**
 * Where the buffered blocks of a video are kept: the encrypted bytes as the server sent them (never plaintext), in the browser's Cache
 * API so that they do not weigh on memory, or in memory when the Cache API is not there. One file at a time: using another file
 * drops the blocks of the previous one. The total is kept under a limit by dropping the blocks farthest from the play position.
 */
const CACHE_NAME = "VIDEO_BUFFER_1";
export const VIDEO_BUFFER_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const MEMORY_FALLBACK_MAX_BYTES = 256 * 1024 * 1024;

let stalePurged: Promise<void> | undefined;

/** A tab that was closed or reloaded has lost the index of what it had stored, so what is left in the cache is unreachable: drop it once. */
function purgeStale(): Promise<void> {
  stalePurged ??= (typeof caches === "undefined" ? Promise.resolve() : caches.delete(CACHE_NAME).then(() => undefined, () => undefined));
  return stalePurged;
}

export class BlockStore {
  private fileKey: string | undefined;
  private readonly sizes = new Map<number, number>();
  private readonly memory = new Map<number, Uint8Array>();
  private totalBytes = 0;
  private readonly useCacheApi: boolean;
  private readonly maxBytes: number;

  constructor(maxBytes = VIDEO_BUFFER_MAX_BYTES, useCacheApi = typeof caches !== "undefined") {
    this.useCacheApi = useCacheApi;
    this.maxBytes = useCacheApi ? maxBytes : Math.min(maxBytes, MEMORY_FALLBACK_MAX_BYTES);
  }

  /** Starts using `fileKey`: blocks of any other file are dropped. */
  async useFile(fileKey: string): Promise<void> {
    if (this.useCacheApi) await purgeStale();
    if (this.fileKey !== undefined && this.fileKey !== fileKey) await this.clear();
    this.fileKey = fileKey;
  }

  has(index: number): boolean {
    return this.sizes.has(index);
  }

  heldIndexes(): IterableIterator<number> {
    return this.sizes.keys();
  }

  get bytes(): number {
    return this.totalBytes;
  }

  async get(index: number): Promise<Uint8Array | undefined> {
    if (!this.sizes.has(index)) return undefined;
    if (!this.useCacheApi) return this.memory.get(index);
    const response = await (await caches.open(CACHE_NAME)).match(this.key(index));
    if (!response) {
      this.forget(index);
      return undefined;
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async put(index: number, bytes: Uint8Array): Promise<void> {
    if (this.fileKey === undefined) throw new Error("No file selected");
    if (this.sizes.has(index)) return;
    if (this.useCacheApi) {
      await (await caches.open(CACHE_NAME)).put(this.key(index), new Response(bytes as Uint8Array<ArrayBuffer>));
    } else {
      this.memory.set(index, bytes);
    }
    this.sizes.set(index, bytes.byteLength);
    this.totalBytes += bytes.byteLength;
  }

  /** Drops the blocks farthest from `centerIndex` until the total is within the limit. */
  async trim(centerIndex: number): Promise<void> {
    if (this.totalBytes <= this.maxBytes) return;
    const byDistance = [...this.sizes.keys()].sort((a, b) => Math.abs(b - centerIndex) - Math.abs(a - centerIndex));
    for (const index of byDistance) {
      if (this.totalBytes <= this.maxBytes) break;
      await this.drop(index);
    }
  }

  async clear(): Promise<void> {
    if (this.useCacheApi && this.sizes.size > 0) {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all([...this.sizes.keys()].map((index) => cache.delete(this.key(index))));
    }
    this.sizes.clear();
    this.memory.clear();
    this.totalBytes = 0;
  }

  private async drop(index: number): Promise<void> {
    if (this.useCacheApi) await (await caches.open(CACHE_NAME)).delete(this.key(index));
    this.forget(index);
  }

  private forget(index: number): void {
    this.totalBytes -= this.sizes.get(index) ?? 0;
    this.sizes.delete(index);
    this.memory.delete(index);
  }

  private key(index: number): string {
    return `/video-buffer/${this.fileKey}/${index}`;
  }
}
