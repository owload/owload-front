import type { FilesystemBackend } from "@/engine/backend/filesystem-backend";
import type { DriveId } from "@/engine/backend/drive-backend";
import { BLOCK_SIZE } from "@/engine/core/constants";
import { BlockStore } from "./block-store";

const PREFETCH_CONCURRENCY = 6;
const FAILED_BLOCK_PAUSE_MS = 5000;
/** The head and the tail of a file come first: an MP4 whose index is at the end cannot start without its tail. */
const EDGE_BLOCKS = 2;

export type ByteRange = [start: number, end: number];

export interface VideoBufferOptions {
  underlying: FilesystemBackend;
  driveId: DriveId;
  /** Absolute position of the file in the drive's data, and its length. */
  fileStart: number;
  fileLength: number;
  fileKey: string;
  store: BlockStore;
  blockSize?: number;
  concurrency?: number;
}

/**
 * The buffer of one video: serves the pieces of the file that the player's range requests turn into (the client cuts them at the
 * boundaries of the stored blocks), keeps every block it fetches, and fetches ahead of the play position on its own. Blocks are the
 * encrypted bytes clipped to the file, so nothing outside the file is ever read for it.
 */
export class VideoBuffer {
  readonly fileStart: number;
  readonly fileLength: number;
  private readonly fileEnd: number;
  private readonly blockSize: number;
  private readonly concurrency: number;
  private readonly firstBlock: number;
  private readonly lastBlock: number;
  private readonly pending = new Map<number, Promise<Uint8Array>>();
  private readonly failedAt = new Map<number, number>();
  private readonly listeners = new Set<() => void>();
  private readonly abort = new AbortController();
  private totalFetchedBytes = 0;
  private busyMs = 0;
  private busySince = 0;
  private windowFrom = 0;
  private windowTo = 0;
  private disposed = false;
  private ready: Promise<void>;

  constructor(private readonly options: VideoBufferOptions) {
    this.fileStart = options.fileStart;
    this.fileLength = options.fileLength;
    this.fileEnd = options.fileStart + options.fileLength;
    this.blockSize = options.blockSize ?? BLOCK_SIZE;
    this.concurrency = options.concurrency ?? PREFETCH_CONCURRENCY;
    this.firstBlock = Math.floor(this.fileStart / this.blockSize);
    this.lastBlock = Math.floor((this.fileEnd - 1) / this.blockSize);
    this.ready = options.store.useFile(options.fileKey);
    this.windowTo = Math.min(this.fileLength, EDGE_BLOCKS * this.blockSize);
    void this.ready.then(() => this.pump());
  }

  covers(offset: number, length: number): boolean {
    return !this.disposed && length > 0 && offset >= this.fileStart && offset + length <= this.fileEnd;
  }

  /** A piece of the file that lies inside one stored block (what the client asks the backend for). */
  async readPiece(offset: number, length: number): Promise<Uint8Array> {
    await this.ready;
    const index = Math.floor(offset / this.blockSize);
    if (Math.floor((offset + length - 1) / this.blockSize) !== index) {
      throw new Error("A piece must lie inside one block");
    }
    const [clipStart] = this.clip(index);
    const block = (await this.options.store.get(index)) ?? (await this.load(index));
    return block.slice(offset - clipStart, offset - clipStart + length);
  }

  /** Tells the buffer where the player is (a byte position in the file) and how far ahead to keep it filled. */
  setWindow(playByte: number, aheadBytes: number): void {
    const from = Math.max(0, Math.min(this.fileLength, Math.floor(playByte)));
    this.windowFrom = from;
    this.windowTo = Math.min(this.fileLength, from + Math.max(0, aheadBytes));
    this.pump();
  }

  /** What is held, as ranges of bytes of the file, merged. */
  heldRanges(): ByteRange[] {
    const ranges: ByteRange[] = [];
    const indexes = [...this.options.store.heldIndexes()].filter((i) => i >= this.firstBlock && i <= this.lastBlock).sort((a, b) => a - b);
    for (const index of indexes) {
      const [clipStart, clipEnd] = this.clip(index);
      const start = clipStart - this.fileStart;
      const end = clipEnd - this.fileStart;
      const last = ranges[ranges.length - 1];
      if (last && last[1] === start) last[1] = end;
      else ranges.push([start, end]);
    }
    return ranges;
  }

  /** Bytes per second that the network has delivered while it was being asked for blocks; undefined until there is enough to say. */
  throughput(): number | undefined {
    const busy = this.busyMs + (this.pending.size > 0 ? Date.now() - this.busySince : 0);
    if (busy < 300 || this.totalFetchedBytes < 2 * this.blockSize) return undefined;
    return (this.totalFetchedBytes / busy) * 1000;
  }

  /** How many bytes are held from `byte` onwards without a gap. */
  heldAhead(byte: number): number {
    for (const [start, end] of this.heldRanges()) {
      if (byte >= start && byte < end) return end - byte;
    }
    return 0;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async dispose(clear: boolean): Promise<void> {
    this.disposed = true;
    this.abort.abort();
    this.listeners.clear();
    if (clear) await this.options.store.clear();
  }

  private clip(index: number): [number, number] {
    return [Math.max(this.fileStart, index * this.blockSize), Math.min(this.fileEnd, (index + 1) * this.blockSize)];
  }

  private load(index: number): Promise<Uint8Array> {
    const existing = this.pending.get(index);
    if (existing) return existing;
    const [start, end] = this.clip(index);
    if (this.pending.size === 0) this.busySince = Date.now();
    const promise = this.options.underlying
      .getDataBlock(this.options.driveId, start, end - start, false, this.abort.signal)
      .then(async (bytes) => {
        if (bytes.byteLength !== end - start) throw new Error("Server responded with wrong data length");
        this.totalFetchedBytes += bytes.byteLength;
        if (!this.disposed) {
          await this.options.store.put(index, bytes);
          await this.options.store.trim(Math.floor((this.fileStart + this.windowFrom) / this.blockSize));
          this.failedAt.delete(index);
          this.notify();
        }
        return bytes;
      })
      .finally(() => {
        this.pending.delete(index);
        if (this.pending.size === 0) this.busyMs += Date.now() - this.busySince;
      });
    this.pending.set(index, promise);
    return promise;
  }

  /** The blocks to have, in the order to get them: the head and the tail, then forward from the play position. */
  private wanted(): number[] {
    const wanted: number[] = [];
    for (let i = 0; i < EDGE_BLOCKS; i++) wanted.push(this.firstBlock + i);
    for (let i = 0; i < EDGE_BLOCKS; i++) wanted.push(this.lastBlock - i);
    const from = Math.floor((this.fileStart + this.windowFrom) / this.blockSize);
    const to = Math.floor((this.fileStart + Math.max(this.windowFrom, this.windowTo - 1)) / this.blockSize);
    for (let i = from; i <= to; i++) wanted.push(i);
    return wanted.filter((i) => i >= this.firstBlock && i <= this.lastBlock);
  }

  private pump(): void {
    if (this.disposed) return;
    const now = Date.now();
    for (const index of this.wanted()) {
      if (this.pending.size >= this.concurrency) break;
      if (this.pending.has(index) || this.options.store.has(index)) continue;
      const failed = this.failedAt.get(index);
      if (failed !== undefined && now - failed < FAILED_BLOCK_PAUSE_MS) continue;
      this.load(index).then(
        () => this.pump(),
        () => {
          this.failedAt.set(index, Date.now());
          setTimeout(() => this.pump(), FAILED_BLOCK_PAUSE_MS);
        },
      );
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
