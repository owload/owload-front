import { describe, expect, it } from "vitest";
import { BlockStore } from "../block-store";
import { MAX_QUEUED_CHUNKS, noteDemand, releaseRequest, waitForRoom } from "../sw-backpressure";

const bytes = (n: number, fill = 1) => new Uint8Array(n).fill(fill);

describe("BlockStore (memory)", () => {
  it("keeps and returns blocks, and counts them", async () => {
    const store = new BlockStore(1000, false);
    await store.useFile("a");
    await store.put(3, bytes(10, 7));
    expect(store.has(3)).toBe(true);
    expect(await store.get(3)).toEqual(bytes(10, 7));
    expect(store.bytes).toBe(10);
    expect(await store.get(4)).toBeUndefined();
  });

  it("drops the blocks of the previous file when another is used", async () => {
    const store = new BlockStore(1000, false);
    await store.useFile("a");
    await store.put(1, bytes(10));
    await store.useFile("b");
    expect(store.has(1)).toBe(false);
    expect(store.bytes).toBe(0);
    await store.useFile("b");
    await store.put(2, bytes(10));
    await store.useFile("b");
    expect(store.has(2)).toBe(true);
  });

  it("trims the blocks farthest from the centre first", async () => {
    const store = new BlockStore(30, false);
    await store.useFile("a");
    for (const i of [0, 1, 2, 3, 4]) await store.put(i, bytes(10));
    await store.trim(3);
    expect(store.bytes).toBeLessThanOrEqual(30);
    expect(store.has(3)).toBe(true);
    expect(store.has(0)).toBe(false);
  });

  it("is cleared completely", async () => {
    const store = new BlockStore(1000, false);
    await store.useFile("a");
    await store.put(1, bytes(10));
    await store.clear();
    expect(store.bytes).toBe(0);
    expect([...store.heldIndexes()]).toEqual([]);
  });
});

describe("waitForRoom", () => {
  it("returns at once while few chunks are queued, and waits for the service worker when many are", async () => {
    await waitForRoom("r1", MAX_QUEUED_CHUNKS); // nothing queued beyond the limit
    let done = false;
    const waiting = waitForRoom("r1", MAX_QUEUED_CHUNKS + 3).then(() => { done = true; });
    await new Promise((r) => setTimeout(r, 10));
    expect(done).toBe(false);
    noteDemand("r1", 3); // the worker handed three on: back within the limit
    await waiting;
    expect(done).toBe(true);
    releaseRequest("r1");
  });

  it("stops waiting when the request is released", async () => {
    const waiting = waitForRoom("r2", MAX_QUEUED_CHUNKS + 5);
    await new Promise((r) => setTimeout(r, 5));
    releaseRequest("r2");
    await waiting;
  });
});
