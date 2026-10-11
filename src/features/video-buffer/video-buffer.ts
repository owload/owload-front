import type { FilesystemBackend } from "@/engine/backend/filesystem-backend";
import type { DriveId } from "@/engine/backend/drive-backend";
import { BLOCK_SIZE } from "@/engine/core/constants";
import { BlockStore } from "./block-store";
import { TransferGovernor } from "./transfer-governor";

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
  /** The most blocks fetched at once; the buffer starts lower and adjusts to the network (see TransferGovernor). */
  concurrency?: number;
  /** How long each try of a block may take before it is abandoned and asked for again, at least (more on a slow line). */
  attemptTimeoutsMs?: number[];
  startConcurrency?: number;
  /** The pause before the second try of a block; it doubles for each further one. */
  retryDelayMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** What went wrong, short enough for the player to show. */
export function describeFailure(error: unknown): string {
  const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
  if (status) return `server answered ${status}`;
  const message = error instanceof Error ? error.message : String(error);
  return message || "unknown error";
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
  private readonly governor: TransferGovernor;
  private readonly firstBlock: number;
  private readonly lastBlock: number;
  private readonly pending = new Map<number, Promise<Uint8Array>>();
  private readonly failedAt = new Map<number, number>();
  private readonly problems = new Map<number, string>();
  private readonly listeners = new Set<() => void>();
  private readonly abort = new AbortController();
  private windowFrom = 0;
  private windowTo = 0;
  private disposed = false;
  private ready: Promise<void>;

  constructor(private readonly options: VideoBufferOptions) {
    this.fileStart = options.fileStart;
    this.fileLength = options.fileLength;
    this.fileEnd = options.fileStart + options.fileLength;
    this.blockSize = options.blockSize ?? BLOCK_SIZE;
    this.governor = new TransferGovernor(
      { max: options.concurrency ?? PREFETCH_CONCURRENCY, start: options.startConcurrency, baseTimeoutsMs: options.attemptTimeoutsMs },
      (index) => Math.abs(index - Math.floor((this.fileStart + this.windowFrom) / this.blockSize)),
    );
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
    return this.governor.throughput();
  }

  /** True for a while after the network proved too slow for the usual number of fetches at once. */
  isSlow(): boolean {
    return this.governor.isSlow();
  }

  /** How many bytes are held from `byte` onwards without a gap. */
  heldAhead(byte: number): number {
    for (const [start, end] of this.heldRanges()) {
      if (byte >= start && byte < end) return end - byte;
    }
    return 0;
  }

  /** Why a block is not loading, while one is not (it is being asked for again); undefined when all is well. */
  problem(): string | undefined {
    return this.problems.values().next().value;
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

  private load(index: number, urgent = false): Promise<Uint8Array> {
    const existing = this.pending.get(index);
    if (existing) return existing;
    const [start, end] = this.clip(index);
    const promise = this.governor
      .schedule(index, () => this.fetchWithRetries(index, start, end), urgent)
      .then(async (bytes) => {
        if (!this.disposed) {
          await this.options.store.put(index, bytes);
          await this.options.store.trim(Math.floor((this.fileStart + this.windowFrom) / this.blockSize));
          this.failedAt.delete(index);
          this.problems.delete(index);
          this.notify();
        }
        return bytes;
      })
      .finally(() => this.pending.delete(index));
    this.pending.set(index, promise);
    return promise;
  }

  /** One block, asked for again when a try fails or hangs; the reason of a failure is kept while it is being asked for again. */
  private async fetchWithRetries(index: number, start: number, end: number): Promise<Uint8Array> {
    const tries = this.options.attemptTimeoutsMs?.length ?? 4;
    let lastError: unknown;
    for (let attempt = 0; attempt < tries; attempt++) {
      const attemptAbort = new AbortController();
      const stop = () => attemptAbort.abort();
      this.abort.signal.addEventListener("abort", stop, { once: true });
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; attemptAbort.abort(new Error("timed out")); }, this.governor.attemptTimeoutMs(attempt));
      const startedAt = Date.now();
      try {
        const bytes = await this.options.underlying.getDataBlock(this.options.driveId, start, end - start, false, attemptAbort.signal);
        if (bytes.byteLength !== end - start) throw new Error("server sent a block of the wrong length");
        this.governor.recordBlock(Date.now() - startedAt, bytes.byteLength);
        return bytes;
      } catch (e) {
        lastError = e;
        if (this.disposed) throw e;
        if (timedOut) this.governor.recordTimeout();
        console.warn(`[video-buffer] block ${index}, try ${attempt + 1} of ${tries} failed:`, e);
        if (attempt >= 1) {
          // a first failure is usually a blip the next try covers; from the second one the player says so
          this.problems.set(index, describeFailure(timedOut ? new Error("timed out") : e));
          this.notify();
        }
        if (attempt < tries - 1) await sleep(Math.min(8000, (this.options.retryDelayMs ?? 1000) * 2 ** attempt));
      } finally {
        clearTimeout(timer);
        this.abort.signal.removeEventListener("abort", stop);
      }
    }
    throw lastError;
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
    let first = true; // the first block still missing from the play position is the one the player will stall on: it may use one slot more
    for (const index of this.wanted()) {
      if (this.pending.has(index) || this.options.store.has(index)) continue;
      const mostUrgent = first;
      first = false;
      if (this.pending.size >= this.governor.limit && !mostUrgent) break;
      const failed = this.failedAt.get(index);
      if (failed !== undefined && now - failed < FAILED_BLOCK_PAUSE_MS) continue;
      this.load(index, mostUrgent).then(
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
