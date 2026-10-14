import { describe, expect, it } from "vitest";
import { AUTO_MAX_WAIT_SEC, AUTO_PREFETCH_SEC, AUTO_TARGET, decideAction, formatTime, nativeAheadSec, prefetchSeconds, secondsNeeded, stabilizeNeeded, decideAfterTargetChange, type PlayerFacts } from "../player-model";

const base: PlayerFacts = { duration: 600, currentTime: 100, aheadSec: 30, targetSec: AUTO_TARGET, playing: true, userPaused: false, waiting: false };

describe("decideAction", () => {
  it("lets a playing video with enough buffer go on", () => {
    expect(decideAction(base)).toBe("none");
  });

  it("pauses a playing video that is about to run dry", () => {
    expect(decideAction({ ...base, aheadSec: 1 })).toBe("pause-for-buffer");
  });

  it("does not pause for the buffer near the end of the video", () => {
    expect(decideAction({ ...base, currentTime: 598.5, aheadSec: 1 })).toBe("none");
  });

  it("in Auto starts at once on a fast line, after a few seconds of buffer", () => {
    const fast = { ...base, playing: false, waiting: true, targetSec: AUTO_TARGET, speedRatio: 3 };
    expect(secondsNeeded(fast)).toBe(4);
    expect(decideAction({ ...fast, aheadSec: 3 })).toBe("none");
    expect(decideAction({ ...fast, aheadSec: 4 })).toBe("resume");
  });

  it("in Auto waits for a few seconds while the speed of the line is not known yet", () => {
    expect(secondsNeeded({ ...base, targetSec: AUTO_TARGET, speedRatio: undefined })).toBe(6);
  });

  it("in Auto waits as long as it takes to play on without stopping on a slow line, with a margin", () => {
    // 100 s left, a line at half the speed of the video: half of it must be on hand
    const slow = { ...base, currentTime: 500, playing: false, waiting: true, targetSec: AUTO_TARGET, speedRatio: 0.5 };
    expect(secondsNeeded(slow)).toBeCloseTo(0.5 * 100 * 1.15);
    expect(decideAction({ ...slow, aheadSec: 40 })).toBe("none");
    expect(decideAction({ ...slow, aheadSec: 58 })).toBe("resume");
  });

  it("in Auto never waits for more than the most, however slow the line", () => {
    expect(secondsNeeded({ ...base, targetSec: AUTO_TARGET, speedRatio: 0.05 })).toBe(AUTO_MAX_WAIT_SEC);
  });

  it("a length the user chose is exactly what is waited for, whatever the speed of the line", () => {
    const fast = { ...base, playing: false, waiting: true, speedRatio: 10 };
    expect(secondsNeeded({ ...fast, targetSec: 30 })).toBe(30);
    expect(decideAction({ ...fast, targetSec: 30, aheadSec: 29 })).toBe("none");
    expect(decideAction({ ...fast, targetSec: 30, aheadSec: 30 })).toBe("resume");
    expect(secondsNeeded({ ...fast, targetSec: 600 })).toBe(500); // only 500 s are left
  });

  it("All waits for the whole of what is left", () => {
    const facts = { ...base, playing: false, waiting: true, targetSec: Infinity, speedRatio: 10 };
    expect(secondsNeeded(facts)).toBe(500);
    expect(decideAction({ ...facts, aheadSec: 499 })).toBe("none");
    expect(decideAction({ ...facts, aheadSec: 500 })).toBe("resume");
  });

  it("a short video needs only what it has, in every mode", () => {
    expect(secondsNeeded({ duration: 42, currentTime: 0, targetSec: Infinity, speedRatio: 0.1 })).toBe(42);
    expect(secondsNeeded({ duration: 42, currentTime: 0, targetSec: 120, speedRatio: 0.1 })).toBe(42);
    expect(secondsNeeded({ duration: 42, currentTime: 0, targetSec: AUTO_TARGET, speedRatio: 0.1 })).toBeLessThanOrEqual(42);
  });

  it("prefetches a fixed distance in Auto and the chosen one otherwise", () => {
    expect(prefetchSeconds(AUTO_TARGET)).toBe(AUTO_PREFETCH_SEC);
    expect(prefetchSeconds(300)).toBe(300);
    expect(prefetchSeconds(Infinity)).toBe(Infinity);
  });

  it("never starts by itself after the user paused", () => {
    expect(decideAction({ ...base, playing: false, waiting: true, userPaused: true, aheadSec: 500 })).toBe("none");
  });

  it("does nothing before the length of the video is known", () => {
    expect(decideAction({ ...base, duration: NaN, playing: false, waiting: true, aheadSec: 500 })).toBe("none");
  });
});

describe("nativeAheadSec", () => {
  const ranges = (pairs: Array<[number, number]>) => ({ length: pairs.length, start: (i: number) => pairs[i][0], end: (i: number) => pairs[i][1] });

  it("is the time loaded after the position, in the range that holds it", () => {
    expect(nativeAheadSec(ranges([[0, 10], [50, 90]]), 60)).toBe(30);
    expect(nativeAheadSec(ranges([[0, 10], [50, 90]]), 30)).toBe(0);
    expect(nativeAheadSec(ranges([]), 0)).toBe(0);
  });
});

describe("formatTime", () => {
  it("shows minutes and seconds, and hours when needed", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.9)).toBe("1:05");
    expect(formatTime(3725)).toBe("1:02:05");
    expect(formatTime(NaN)).toBe("0:00");
  });
});

describe("stabilizeNeeded", () => {
  it("rounds up to five seconds, with five as the least", () => {
    expect(stabilizeNeeded(undefined, 4)).toBe(5);
    expect(stabilizeNeeded(undefined, 6)).toBe(10);
    expect(stabilizeNeeded(undefined, 10)).toBe(10);
  });

  it("does not follow small changes of the measured speed", () => {
    let needed = stabilizeNeeded(undefined, 6); // 10
    for (const computed of [5.1, 7, 9, 6.5, 8.2, 11, 9.4, 12]) needed = stabilizeNeeded(needed, computed);
    expect(needed).toBe(10);
  });

  it("goes up when the new figure is clearly higher, and never down within a wait", () => {
    expect(stabilizeNeeded(10, 20)).toBe(20);
    expect(stabilizeNeeded(20, 6)).toBe(20);
    expect(stabilizeNeeded(10, 12.5)).toBe(10); // not yet clearly higher
    expect(stabilizeNeeded(10, 14)).toBe(10);
    expect(stabilizeNeeded(10, 16)).toBe(20);
  });

  it("is used by the decision to resume, so that what is shown is what is waited for", () => {
    const facts = { ...base, playing: false, waiting: true, targetSec: AUTO_TARGET, speedRatio: 3, neededSec: 15 };
    expect(decideAction({ ...facts, aheadSec: 10 })).toBe("none"); // the speed alone would say 4 seconds
    expect(decideAction({ ...facts, aheadSec: 15 })).toBe("resume");
  });
});

describe("decideAfterTargetChange", () => {
  const playing = { ...base, playing: true, waiting: false, aheadSec: 20, speedRatio: 3 };
  const waitingFacts = { ...base, playing: false, waiting: true, aheadSec: 20, speedRatio: 3 };

  it("stops a video that is playing when the new choice needs more than is on hand", () => {
    expect(decideAfterTargetChange({ ...playing, targetSec: 60 })).toBe("pause-for-buffer");
    expect(decideAfterTargetChange({ ...playing, targetSec: Infinity })).toBe("pause-for-buffer");
  });

  it("lets a video that is playing go on when the new choice is already satisfied", () => {
    expect(decideAfterTargetChange({ ...playing, targetSec: 15 })).toBe("none");
    expect(decideAfterTargetChange({ ...playing, targetSec: 20 })).toBe("none");
    expect(decideAfterTargetChange({ ...playing, targetSec: AUTO_TARGET })).toBe("none");
  });

  it("starts a video that is waiting when a smaller choice is already on hand (the decrease counts)", () => {
    expect(decideAfterTargetChange({ ...waitingFacts, targetSec: Infinity })).toBe("none"); // 500 s are not on hand
    expect(decideAfterTargetChange({ ...waitingFacts, targetSec: 30 })).toBe("none"); // 30 > 20
    expect(decideAfterTargetChange({ ...waitingFacts, targetSec: 15 })).toBe("resume");
    expect(decideAfterTargetChange({ ...waitingFacts, targetSec: AUTO_TARGET })).toBe("resume"); // a fast line needs only a few seconds
  });

  it("ignores a figure of the old choice, so that going from All to Auto does not keep waiting for all of it", () => {
    const fromAll = { ...waitingFacts, targetSec: AUTO_TARGET, neededSec: 500 };
    expect(decideAfterTargetChange(fromAll)).toBe("resume");
  });

  it("does not start a video the user paused, and does not stop one near its end", () => {
    expect(decideAfterTargetChange({ ...waitingFacts, userPaused: true, targetSec: 15 })).toBe("none");
    expect(decideAfterTargetChange({ ...playing, currentTime: 595, aheadSec: 4.6, targetSec: 60 })).toBe("none");
  });
});
