/**
 * Decides how many blocks are fetched at once and how long a try may take, from how the network is behaving. On a good line it runs up
 * to `max` fetches at once; when blocks come slowly (they share the line, so more at once is slower for each, and past the timeout all
 * of them are lost) it halves the number, down to one, and allows each try more time. Reads the player asks for and blocks fetched ahead
 * wait in one queue, nearest to the play position first.
 */
export interface GovernorOptions {
  max: number;
  /** Where the number of fetches at once starts; it grows from here while blocks arrive quickly. */
  start?: number;
  baseTimeoutsMs?: number[];
  /** A block that takes longer than this on average (as measured) makes the governor cut the number of fetches at once. */
  slowBlockMs?: number;
  /** A block that takes less than this lets it add some. */
  fastBlockMs?: number;
  adjustCooldownMs?: number;
  now?: () => number;
}

interface Entry {
  key: number;
  seq: number;
  start: () => void;
}

const DEFAULT_TIMEOUTS_MS = [60_000, 90_000, 150_000, 150_000];

export class TransferGovernor {
  private readonly max: number;
  private readonly baseTimeoutsMs: number[];
  private readonly slowBlockMs: number;
  private readonly fastBlockMs: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private currentLimit: number;
  private running = 0;
  private seq = 0;
  private readonly queue: Entry[] = [];
  private blockMs: number | undefined;
  private lastAdjustAt = Number.NEGATIVE_INFINITY;
  private lastCutAt = Number.NEGATIVE_INFINITY;
  private fetchedBytes = 0;
  private busyMs = 0;
  private busySince = 0;

  constructor(options: GovernorOptions, private readonly priorityOf: (key: number) => number) {
    this.max = Math.max(1, options.max);
    this.currentLimit = Math.max(1, Math.min(this.max, options.start ?? 3));
    this.baseTimeoutsMs = options.baseTimeoutsMs ?? DEFAULT_TIMEOUTS_MS;
    this.slowBlockMs = options.slowBlockMs ?? 10_000;
    this.fastBlockMs = options.fastBlockMs ?? 3_000;
    this.cooldownMs = options.adjustCooldownMs ?? 1_500;
    this.now = options.now ?? Date.now;
  }

  get limit(): number {
    return this.currentLimit;
  }

  get active(): number {
    return this.running;
  }

  /** Runs `task` when a slot is free; the nearest to the play position goes first. `urgent` may use one slot more than the limit. */
  schedule<T>(key: number, task: () => Promise<T>, urgent = false): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const entry: Entry = {
        key,
        seq: this.seq++,
        start: () => {
          if (this.running === 0) this.busySince = this.now();
          this.running++;
          task()
            .then(resolve, reject)
            .finally(() => {
              this.running--;
              if (this.running === 0) this.busyMs += this.now() - this.busySince;
              this.drain();
            });
        },
      };
      if (urgent && this.running < this.currentLimit + 1) {
        entry.start();
        return;
      }
      this.queue.push(entry);
      this.drain();
    });
  }

  /** How long one try of a block may take: the usual allowance, or several times what blocks have been taking, whichever is more. */
  attemptTimeoutMs(attempt: number): number {
    const base = this.baseTimeoutsMs[Math.min(attempt, this.baseTimeoutsMs.length - 1)];
    return Math.max(base, 6 * (this.blockMs ?? 0));
  }

  recordBlock(durationMs: number, bytes: number): void {
    this.fetchedBytes += bytes;
    this.blockMs = this.blockMs === undefined ? durationMs : 0.7 * this.blockMs + 0.3 * durationMs;
    const now = this.now();
    if (now - this.lastAdjustAt < this.cooldownMs) return;
    if (this.blockMs > this.slowBlockMs && this.currentLimit > 1) {
      this.cut(now);
      this.blockMs /= 2; // fewer at once share the line among fewer: the next blocks should take about half as long
    } else if (this.blockMs < this.fastBlockMs && this.currentLimit < this.max) {
      this.currentLimit = Math.min(this.max, this.currentLimit + 2);
      this.lastAdjustAt = now;
      this.drain();
    }
  }

  /** A try that ran out of time: the line is too slow for this many at once. */
  recordTimeout(): void {
    const now = this.now();
    if (this.currentLimit > 1) this.cut(now);
  }

  /** True for a while after the governor had to cut the number of fetches because the line is slow. */
  isSlow(): boolean {
    return this.now() - this.lastCutAt < 60_000;
  }

  /** Bytes per second delivered while something was being fetched; undefined until there is enough to say. */
  throughput(): number | undefined {
    const busy = this.busyMs + (this.running > 0 ? this.now() - this.busySince : 0);
    if (busy < 300 || this.fetchedBytes <= 0) return undefined;
    return (this.fetchedBytes / busy) * 1000;
  }

  private cut(now: number): void {
    this.currentLimit = Math.max(1, Math.floor(this.currentLimit / 2));
    this.lastAdjustAt = now;
    this.lastCutAt = now;
  }

  private drain(): void {
    while (this.running < this.currentLimit && this.queue.length > 0) {
      let best = 0;
      let bestScore = this.priorityOf(this.queue[0].key);
      for (let i = 1; i < this.queue.length; i++) {
        const score = this.priorityOf(this.queue[i].key);
        if (score < bestScore || (score === bestScore && this.queue[i].seq < this.queue[best].seq)) {
          best = i;
          bestScore = score;
        }
      }
      this.queue.splice(best, 1)[0].start();
    }
  }
}
