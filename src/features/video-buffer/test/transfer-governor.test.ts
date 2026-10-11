import { describe, expect, it } from "vitest";
import { TransferGovernor } from "../transfer-governor";

function clock() {
  let t = 0;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

const idle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("TransferGovernor", () => {
  it("starts with a few fetches at once and adds more while blocks arrive quickly", () => {
    const c = clock();
    const g = new TransferGovernor({ max: 6, start: 2, now: c.now }, () => 0);
    expect(g.limit).toBe(2);
    c.advance(2000);
    g.recordBlock(500, 1 << 20);
    expect(g.limit).toBe(4);
    c.advance(2000);
    g.recordBlock(500, 1 << 20);
    expect(g.limit).toBe(6);
    c.advance(2000);
    g.recordBlock(500, 1 << 20);
    expect(g.limit).toBe(6);
  });

  it("cuts the number of fetches at once, down to one, while blocks are slow, and allows more time to each try", () => {
    const c = clock();
    const g = new TransferGovernor({ max: 6, start: 6, now: c.now, baseTimeoutsMs: [30_000, 60_000] }, () => 0);
    c.advance(2000);
    g.recordBlock(40_000, 1 << 20); // a block took 40 s with six at once
    expect(g.limit).toBe(3);
    expect(g.isSlow()).toBe(true);
    expect(g.attemptTimeoutMs(0)).toBeGreaterThan(30_000); // six times what blocks have been taking, not the usual 30 s
    c.advance(2000);
    g.recordBlock(25_000, 1 << 20);
    c.advance(2000);
    g.recordBlock(25_000, 1 << 20);
    c.advance(2000);
    g.recordBlock(25_000, 1 << 20);
    expect(g.limit).toBe(1);
  });

  it("does not change its mind more than once in a short while", () => {
    const c = clock();
    const g = new TransferGovernor({ max: 6, start: 6, now: c.now }, () => 0);
    c.advance(2000);
    g.recordBlock(40_000, 1);
    const afterFirst = g.limit;
    g.recordBlock(40_000, 1); // at once: still the cooldown
    expect(g.limit).toBe(afterFirst);
  });

  it("cuts when a try runs out of time", () => {
    const c = clock();
    const g = new TransferGovernor({ max: 6, start: 6, now: c.now }, () => 0);
    g.recordTimeout();
    expect(g.limit).toBe(3);
    g.recordTimeout();
    g.recordTimeout();
    expect(g.limit).toBe(1);
    g.recordTimeout();
    expect(g.limit).toBe(1);
  });

  it("runs the nearest to the play position first, and never more than the limit", async () => {
    const g = new TransferGovernor({ max: 1, start: 1 }, (key) => key);
    const order: number[] = [];
    const releases: Array<() => void> = [];
    const run = (key: number) => g.schedule(key, () => new Promise<void>((resolve) => { order.push(key); releases.push(resolve); }));
    const all = [run(9), run(5), run(7), run(1)];
    await idle();
    expect(order).toEqual([9]); // 9 got the only slot because it came first; the rest wait
    expect(g.active).toBe(1);
    for (let i = 0; i < 4; i++) { releases[i]?.(); await idle(); }
    await Promise.all(all);
    expect(order).toEqual([9, 1, 5, 7]);
  });

  it("lets the urgent one use a slot more than the limit", async () => {
    const g = new TransferGovernor({ max: 1, start: 1 }, () => 0);
    const started: string[] = [];
    void g.schedule(1, () => new Promise<void>(() => started.push("a")));
    void g.schedule(2, () => new Promise<void>(() => started.push("b")));
    void g.schedule(3, () => new Promise<void>(() => started.push("urgent")), true);
    await idle();
    expect(started).toEqual(["a", "urgent"]);
  });

  it("measures how fast the network delivers while something was being fetched", async () => {
    const c = clock();
    const g = new TransferGovernor({ max: 2, start: 2, now: c.now }, () => 0);
    expect(g.throughput()).toBeUndefined();
    const task = g.schedule(1, () => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    c.advance(1000);
    g.recordBlock(1000, 2_000_000);
    await task;
    expect(g.throughput()).toBeCloseTo(2_000_000, -3);
  });
});
