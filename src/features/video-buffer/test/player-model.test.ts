import { describe, expect, it } from "vitest";
import { decideAction, formatTime, nativeAheadSec, secondsNeeded, type PlayerFacts } from "../player-model";

const base: PlayerFacts = { duration: 600, currentTime: 100, aheadSec: 30, targetSec: 60, playing: true, userPaused: false, waiting: false };

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

  it("starts at once on a fast line, after a few seconds of buffer", () => {
    const fast = { ...base, playing: false, waiting: true, targetSec: 600, speedRatio: 3 };
    expect(secondsNeeded(fast)).toBe(4);
    expect(decideAction({ ...fast, aheadSec: 3 })).toBe("none");
    expect(decideAction({ ...fast, aheadSec: 4 })).toBe("resume");
  });

  it("waits for a few seconds while the speed of the line is not known yet", () => {
    const unknown = { ...base, playing: false, waiting: true, targetSec: 600, speedRatio: undefined };
    expect(secondsNeeded(unknown)).toBe(6);
  });

  it("waits as long as it takes to play on without stopping on a slow line", () => {
    // 600 s video, 100 s played, line at half the speed of the video: 500 s left, half of it must be on hand, with a margin
    const slow = { ...base, playing: false, waiting: true, targetSec: Infinity, speedRatio: 0.5 };
    expect(secondsNeeded(slow)).toBeCloseTo(0.5 * 500 * 1.15);
    expect(decideAction({ ...slow, aheadSec: 200 })).toBe("none");
    expect(decideAction({ ...slow, aheadSec: 290 })).toBe("resume");
  });

  it("never waits for more than the target the user chose", () => {
    const slow = { ...base, playing: false, waiting: true, targetSec: 60, speedRatio: 0.1 };
    expect(secondsNeeded(slow)).toBe(60);
    expect(decideAction({ ...slow, aheadSec: 60 })).toBe("resume");
  });

  it("needs only what is left when less than that remains", () => {
    expect(secondsNeeded({ duration: 130, currentTime: 100, targetSec: 60, speedRatio: 0.1 })).toBe(30);
    expect(decideAction({ ...base, duration: 130, playing: false, waiting: true, aheadSec: 30, speedRatio: 0.1 })).toBe("resume");
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
