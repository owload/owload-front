import { describe, expect, it } from 'vitest';
import { planBlocks, readBlocksInParallel } from '../parallel-blocks';

const BLOCK = 8;

function source(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, i) => i % 251);
}

async function readAll(rs: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = rs.getReader();
  const parts: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.byteLength; }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('planBlocks', () => {
  it('aligns the first block to the block size and shortens the last one', () => {
    expect(planBlocks(5, 20, BLOCK)).toEqual([
      { byteOffset: 5, byteLength: 3 },
      { byteOffset: 8, byteLength: 8 },
      { byteOffset: 16, byteLength: 8 },
      { byteOffset: 24, byteLength: 1 },
    ]);
  });

  it('gives one short block for a short range and none for an empty one', () => {
    expect(planBlocks(2, 3, BLOCK)).toEqual([{ byteOffset: 2, byteLength: 3 }]);
    expect(planBlocks(0, 0, BLOCK)).toEqual([]);
  });
});

describe('readBlocksInParallel', () => {
  it('returns the bytes in order even when blocks arrive out of order', async () => {
    const data = source(100);
    const delays = new Map<number, number>();
    const rs = readBlocksInParallel({
      byteOffset: 3, byteLength: 90, blockSize: BLOCK, concurrency: 4,
      fetchBlock: async (offset, length) => {
        await sleep(delays.get(offset) ?? ((offset * 7) % 13));
        return data.slice(offset, offset + length);
      },
    });
    expect(await readAll(rs)).toEqual(data.slice(3, 93));
  });

  it('never has more than the window in flight, and keeps it full', async () => {
    const data = source(200);
    let inFlight = 0;
    let max = 0;
    const rs = readBlocksInParallel({
      byteOffset: 0, byteLength: 200, blockSize: BLOCK, concurrency: 3,
      fetchBlock: async (offset, length) => {
        inFlight++;
        max = Math.max(max, inFlight);
        await sleep(5);
        inFlight--;
        return data.slice(offset, offset + length);
      },
    });
    await readAll(rs);
    expect(max).toBe(3);
  });

  it('fails the stream when a block fails, and aborts the others', async () => {
    const data = source(100);
    let aborted = 0;
    const rs = readBlocksInParallel({
      byteOffset: 0, byteLength: 100, blockSize: BLOCK, concurrency: 4,
      fetchBlock: (offset, length, signal) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { aborted++; reject(new Error('aborted')); });
        if (offset === 16) { setTimeout(() => reject(new Error('boom')), 2); return; }
        if (offset < 16) { setTimeout(() => resolve(data.slice(offset, offset + length)), 1); return; }
        // later blocks stay pending until aborted
      }),
    });
    await expect(readAll(rs)).rejects.toThrow('boom');
    expect(aborted).toBeGreaterThan(0);
  });

  it('rejects a block of the wrong length', async () => {
    const rs = readBlocksInParallel({
      byteOffset: 0, byteLength: 16, blockSize: BLOCK, concurrency: 2,
      fetchBlock: async (_offset, length) => new Uint8Array(length - 1),
    });
    await expect(readAll(rs)).rejects.toThrow('wrong data length');
  });

  it('aborts the requests in flight when the consumer cancels', async () => {
    let aborted = 0;
    const rs = readBlocksInParallel({
      byteOffset: 0, byteLength: 100, blockSize: BLOCK, concurrency: 4,
      fetchBlock: (offset, length, signal) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { aborted++; reject(new Error('aborted')); });
        if (offset === 0) setTimeout(() => resolve(new Uint8Array(length)), 1);
      }),
    });
    const reader = rs.getReader();
    await reader.read();
    await reader.cancel();
    expect(aborted).toBeGreaterThan(0);
  });

  it('aborts when the outer signal is aborted', async () => {
    const controller = new AbortController();
    const rs = readBlocksInParallel({
      byteOffset: 0, byteLength: 100, blockSize: BLOCK, concurrency: 2, signal: controller.signal,
      fetchBlock: (_offset, _length, signal) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('stopped')));
      }),
    });
    const read = readAll(rs);
    await sleep(5);
    controller.abort(new Error('stopped'));
    await expect(read).rejects.toThrow('stopped');
  });

  it('streams an empty range as an empty stream', async () => {
    const rs = readBlocksInParallel({
      byteOffset: 0, byteLength: 0, blockSize: BLOCK, concurrency: 2,
      fetchBlock: async () => { throw new Error('should not be called'); },
    });
    expect((await readAll(rs)).byteLength).toBe(0);
  });
});
