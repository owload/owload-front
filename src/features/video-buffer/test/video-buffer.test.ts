import { describe, expect, it } from "vitest";
import type { FilesystemBackend } from "@/engine/backend/filesystem-backend";
import { BlockStore } from "../block-store";
import { VideoBuffer } from "../video-buffer";
import { BufferingFilesystemBackend } from "../buffering-filesystem-backend";

const BLOCK = 16;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A drive whose data byte i is i % 251, counting the reads it serves. */
function fakeDrive(delayMs = 0) {
  const reads: Array<{ offset: number; length: number }> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const backend = {
    async getDataBlock(_drive: string, offset: number, length: number) {
      reads.push({ offset, length });
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(delayMs);
      inFlight--;
      return Uint8Array.from({ length }, (_, i) => (offset + i) % 251);
    },
  } as unknown as FilesystemBackend;
  return { backend, reads, maxInFlight: () => maxInFlight };
}

function makeBuffer(drive: ReturnType<typeof fakeDrive>, fileStart: number, fileLength: number, store = new BlockStore(1 << 20, false), concurrency = 3) {
  return new VideoBuffer({ underlying: drive.backend, driveId: "d", fileStart, fileLength, fileKey: `d:${fileStart}:${fileLength}`, store, blockSize: BLOCK, concurrency });
}

const expected = (offset: number, length: number) => Uint8Array.from({ length }, (_, i) => (offset + i) % 251);

describe("VideoBuffer", () => {
  it("serves a piece from a block clipped to the file, and never reads outside the file", async () => {
    const drive = fakeDrive();
    const buffer = makeBuffer(drive, 20, 50); // the file is bytes 20..70 of the drive
    expect(await buffer.readPiece(20, 12)).toEqual(expected(20, 12)); // the rest of block 1
    expect(await buffer.readPiece(64, 6)).toEqual(expected(64, 6)); // the start of the last block, clipped at 70
    for (const r of drive.reads) {
      expect(r.offset).toBeGreaterThanOrEqual(20);
      expect(r.offset + r.length).toBeLessThanOrEqual(70);
    }
    await buffer.dispose(true);
  });

  it("keeps what it fetched: a second read of the same block does not ask again", async () => {
    const drive = fakeDrive();
    const buffer = makeBuffer(drive, 0, 64);
    await buffer.readPiece(16, 16);
    const reads = drive.reads.filter((r) => r.offset === 16).length;
    await buffer.readPiece(20, 4);
    await buffer.readPiece(16, 16);
    expect(drive.reads.filter((r) => r.offset === 16).length).toBe(reads);
    await buffer.dispose(true);
  });

  it("asks once for a block that two readers want at the same time", async () => {
    const drive = fakeDrive(5);
    const buffer = makeBuffer(drive, 0, 64);
    const [a, b] = await Promise.all([buffer.readPiece(32, 16), buffer.readPiece(36, 4)]);
    expect(a).toEqual(expected(32, 16));
    expect(b).toEqual(expected(36, 4));
    expect(drive.reads.filter((r) => r.offset === 32).length).toBe(1);
    await buffer.dispose(true);
  });

  it("takes the head and the tail of the file first", async () => {
    const drive = fakeDrive(2);
    const buffer = makeBuffer(drive, 0, 16 * 20, new BlockStore(1 << 20, false), 6);
    await sleep(60);
    const held = buffer.heldRanges();
    expect(held[0]).toEqual([0, 32]);
    expect(held[held.length - 1]).toEqual([16 * 18, 16 * 20]);
    await buffer.dispose(true);
  });

  it("fetches ahead of the play position, in parallel, and only as far as asked", async () => {
    const drive = fakeDrive(3);
    const buffer = makeBuffer(drive, 0, 16 * 40, new BlockStore(1 << 20, false), 4);
    await sleep(30);
    buffer.setWindow(16 * 10, 16 * 8); // blocks 10..17
    await sleep(120);
    const held = buffer.heldRanges();
    expect(held.some(([a, b]) => a <= 16 * 10 && b >= 16 * 18)).toBe(true);
    expect(buffer.heldAhead(16 * 10)).toBeGreaterThanOrEqual(16 * 8);
    expect(buffer.heldAhead(16 * 10)).toBeLessThan(16 * 12); // not the whole file
    expect(drive.maxInFlight()).toBeGreaterThan(1);
    expect(drive.maxInFlight()).toBeLessThanOrEqual(4);
    await buffer.dispose(true);
  });

  it("keeps within the limit by dropping the blocks farthest from the play position", async () => {
    const drive = fakeDrive();
    const store = new BlockStore(16 * 6, false); // six blocks
    const buffer = makeBuffer(drive, 0, 16 * 40, store, 4);
    await sleep(10);
    buffer.setWindow(16 * 20, 16 * 30);
    await sleep(100);
    expect(store.bytes).toBeLessThanOrEqual(16 * 6);
    expect(store.has(20)).toBe(true);
    await buffer.dispose(true);
  });

  it("can start again from another place after a seek", async () => {
    const drive = fakeDrive(2);
    const buffer = makeBuffer(drive, 0, 16 * 30, new BlockStore(1 << 20, false), 3);
    buffer.setWindow(0, 16 * 4);
    await sleep(50);
    buffer.setWindow(16 * 25, 16 * 3);
    await sleep(50);
    expect(buffer.heldAhead(16 * 25)).toBeGreaterThanOrEqual(16 * 3);
    await buffer.dispose(true);
  });

  it("measures how fast the network delivers, once there is enough to say", async () => {
    const drive = fakeDrive(120);
    const buffer = makeBuffer(drive, 0, 16 * 30, new BlockStore(1 << 20, false), 4);
    expect(buffer.throughput()).toBeUndefined();
    buffer.setWindow(0, 16 * 12);
    await sleep(700);
    const speed = buffer.throughput();
    expect(speed).toBeDefined();
    // about sixteen blocks of 16 bytes in four rounds of 120 ms: some hundreds of bytes per second
    expect(speed!).toBeGreaterThan(100);
    expect(speed!).toBeLessThan(20000);
    await buffer.dispose(true);
  });

  it("refuses a piece that crosses a block", async () => {
    const buffer = makeBuffer(fakeDrive(), 0, 64);
    await expect(buffer.readPiece(10, 12)).rejects.toThrow("inside one block");
    await buffer.dispose(true);
  });
});

describe("VideoBuffer when the network misbehaves", () => {
  /** A drive that fails or hangs the first tries of chosen blocks. */
  function flakyDrive(opts: { failFirst?: Map<number, number>; hangFirst?: Set<number> }) {
    const tries = new Map<number, number>();
    const backend = {
      async getDataBlock(_drive: string, offset: number, length: number, _cache?: boolean, signal?: AbortSignal) {
        const n = (tries.get(offset) ?? 0) + 1;
        tries.set(offset, n);
        if (opts.hangFirst?.has(offset) && n === 1) {
          await new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new Error("aborted"))));
        }
        if ((opts.failFirst?.get(offset) ?? 0) >= n) throw Object.assign(new Error("boom"), { response: { status: 503 } });
        return Uint8Array.from({ length }, (_, i) => (offset + i) % 251);
      },
    } as unknown as FilesystemBackend;
    return { backend, tries };
  }
  const make = (backend: FilesystemBackend, extra: Partial<ConstructorParameters<typeof VideoBuffer>[0]> = {}) =>
    new VideoBuffer({ underlying: backend, driveId: "d", fileStart: 0, fileLength: 16 * 8, fileKey: "k", store: new BlockStore(1 << 20, false), blockSize: BLOCK, concurrency: 3, attemptTimeoutsMs: [200, 200, 200], retryDelayMs: 5, ...extra });

  it("asks again for a block whose request failed, and then serves it", async () => {
    const drive = flakyDrive({ failFirst: new Map([[32, 1]]) });
    const buffer = make(drive.backend);
    expect(await buffer.readPiece(32, 16)).toEqual(expected(32, 16));
    expect(drive.tries.get(32)).toBe(2);
    await buffer.dispose(true);
  });

  it("says why a block is not loading while it is being asked for again, and stops saying so once it loads", async () => {
    const drive = flakyDrive({ failFirst: new Map([[48, 2]]) });
    const buffer = make(drive.backend, { retryDelayMs: 60 });
    const read = buffer.readPiece(48, 16);
    await sleep(30);
    expect(buffer.problem()).toBeUndefined(); // the first failure is not worth alarming anybody
    await sleep(150);
    expect(buffer.problem()).toContain("503"); // the second one is
    await read;
    expect(buffer.problem()).toBeUndefined();
    await buffer.dispose(true);
  });

  it("abandons a request that hangs and asks again instead of waiting for it", async () => {
    const drive = flakyDrive({ hangFirst: new Set([64]) });
    const buffer = make(drive.backend);
    const started = Date.now();
    expect(await buffer.readPiece(64, 16)).toEqual(expected(64, 16));
    expect(drive.tries.get(64)).toBe(2);
    expect(Date.now() - started).toBeLessThan(1500);
    await buffer.dispose(true);
  });

  it("gives up with the reason when every try fails", async () => {
    const drive = flakyDrive({ failFirst: new Map([[16, 99]]) });
    const buffer = make(drive.backend, { attemptTimeoutsMs: [50, 50] });
    await expect(buffer.readPiece(16, 16)).rejects.toThrow("boom");
    expect(buffer.problem()).toContain("503");
    await buffer.dispose(true);
  });

  it("starts the block the player stalls on even when every slot is taken by blocks further on", async () => {
    const started: number[] = [];
    const backend = {
      async getDataBlock(_drive: string, offset: number, length: number) {
        started.push(offset);
        await sleep(offset >= 16 * 5 && offset < 16 * 10 ? 400 : 5); // the blocks in the middle are slow and fill the slots
        return Uint8Array.from({ length }, (_, i) => (offset + i) % 251);
      },
    } as unknown as FilesystemBackend;
    const buffer = make(backend, { fileLength: 16 * 12, concurrency: 2 });
    await sleep(30);
    buffer.setWindow(16 * 5, 16 * 6); // slow blocks 5.. are asked for, taking both slots
    await sleep(30);
    buffer.setWindow(16 * 2, 16 * 3); // the player seeks back to block 2 (not held yet)
    await sleep(60);
    expect(started).toContain(16 * 2);
    expect(buffer.heldAhead(16 * 2)).toBeGreaterThanOrEqual(16);
    await buffer.dispose(true);
  });
});

describe("BufferingFilesystemBackend", () => {
  it("answers from the buffer of a file it covers and passes everything else on", async () => {
    const drive = fakeDrive();
    const layer = new BufferingFilesystemBackend(drive.backend, "d", false);
    const outside = await layer.getDataBlock("d", 0, 8);
    expect(outside).toEqual(expected(0, 8));
    expect(drive.reads).toHaveLength(1);

    const buffer = layer.openBuffer(100, 200);
    const first = await layer.getDataBlock("d", 104, 8);
    expect(first).toEqual(expected(104, 8));
    const readsAfterFirst = drive.reads.length;
    await layer.getDataBlock("d", 104, 8);
    expect(drive.reads.length).toBe(readsAfterFirst); // the second time it came from the buffer

    layer.closeBuffer(buffer);
    await layer.getDataBlock("d", 104, 8);
    expect(drive.reads.length).toBe(readsAfterFirst + 1); // the buffer is gone: back to the drive
  });

  it("leaves nothing behind when the buffer is ephemeral", async () => {
    const drive = fakeDrive();
    const layer = new BufferingFilesystemBackend(drive.backend, "d", true);
    const buffer = layer.openBuffer(0, 64);
    await layer.getDataBlock("d", 0, 8);
    expect(buffer.heldRanges().length).toBeGreaterThan(0);
    layer.closeBuffer(buffer);
    await sleep(10);
    expect(buffer.heldRanges()).toEqual([]);
  });
});
