import { describe, expect, it } from 'vitest';
import { planBlocks, readBlocksInParallel, writeBlocksInParallel } from '../parallel-blocks';

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


describe('writeBlocksInParallel', () => {
  async function writeAll(ws: WritableStream<Uint8Array>, chunks: Uint8Array[]) {
    const writer = ws.getWriter();
    for (const c of chunks) await writer.write(c);
    await writer.close();
  }
  const chunks = (n: number, size = BLOCK) => Array.from({ length: n }, (_, i) => new Uint8Array(size).fill(i + 1));

  it('writes every block at its own offset, several at once, and finishes after the last one', async () => {
    const written = new Map<number, number>();
    let inFlight = 0;
    let max = 0;
    let finishedAfter = -1;
    const ws = writeBlocksInParallel({
      concurrency: 3,
      writeBlock: async (chunk, offset) => {
        inFlight++;
        max = Math.max(max, inFlight);
        await sleep(((offset * 7) % 11) + 1);
        written.set(offset, chunk[0]);
        inFlight--;
      },
      onFinished: async () => { finishedAfter = written.size; },
    });
    await writeAll(ws, [...chunks(9), new Uint8Array(3).fill(10)]);
    expect([...written.keys()].sort((a, b) => a - b)).toEqual([0, 8, 16, 24, 32, 40, 48, 56, 64, 72]);
    expect(written.get(72)).toBe(10);
    expect(max).toBe(3);
    expect(finishedAfter).toBe(10);
  });

  it('reports each written block', async () => {
    let total = 0;
    const ws = writeBlocksInParallel({
      concurrency: 2,
      writeBlock: async () => { await sleep(1); },
      onBlockWritten: (n) => { total += n; },
    });
    await writeAll(ws, chunks(5));
    expect(total).toBe(5 * BLOCK);
  });

  it('fails when a block fails, aborts the others, and does not finish', async () => {
    let aborted = 0;
    let finished = false;
    const ws = writeBlocksInParallel({
      concurrency: 3,
      writeBlock: (_chunk, offset, signal) => new Promise<void>((resolve, reject) => {
        signal.addEventListener('abort', () => { aborted++; reject(new Error('aborted')); });
        if (offset === 8) setTimeout(() => reject(new Error('boom')), 2);
        else if (offset === 0) setTimeout(resolve, 1);
      }),
      onFinished: async () => { finished = true; },
    });
    await expect(writeAll(ws, chunks(10))).rejects.toThrow('boom');
    expect(aborted).toBeGreaterThan(0);
    expect(finished).toBe(false);
  });

  it('does not finish when the outer signal is aborted', async () => {
    const controller = new AbortController();
    let finished = false;
    const ws = writeBlocksInParallel({
      concurrency: 2, signal: controller.signal,
      writeBlock: (_chunk, _offset, signal) => new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('stopped')));
      }),
      onFinished: async () => { finished = true; },
    });
    const done = writeAll(ws, chunks(6));
    await sleep(5);
    controller.abort(new Error('stopped'));
    await expect(done).rejects.toThrow('stopped');
    expect(finished).toBe(false);
  });

  it('finishes an empty write', async () => {
    let finished = false;
    const ws = writeBlocksInParallel({ concurrency: 2, writeBlock: async () => undefined, onFinished: async () => { finished = true; } });
    await writeAll(ws, []);
    expect(finished).toBe(true);
  });
});
