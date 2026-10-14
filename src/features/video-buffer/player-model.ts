/** The pure part of the buffered player: what to do about the buffer, kept apart from React so that it can be tested. */

/** Seconds of playback that must be on hand before a stalled video is allowed to continue. */
export const STALL_BELOW_SEC = 2;
/** "Auto": the player works out how much to buffer before playing from the speed of the network; the lengths below are not used. */
export const AUTO_TARGET = 0;
/** What to buffer before playing: Auto, or a length in seconds (the whole of what is left for "All"). */
export const TARGET_OPTIONS: ReadonlyArray<{ label: string; seconds: number }> = [
  { label: "Auto", seconds: AUTO_TARGET },
  { label: "30 s", seconds: 30 },
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "All", seconds: Infinity },
];
export const DEFAULT_TARGET_SEC = AUTO_TARGET;
/** In Auto mode: the most it waits for before playing, and how far ahead it keeps fetching. A longer wait is for the user to choose. */
export const AUTO_MAX_WAIT_SEC = 120;
export const AUTO_PREFETCH_SEC = 180;

/** The least that is worth starting on: a few seconds, so that a fast line starts almost at once. */
export const MIN_START_SEC = 4;
/** Used while the speed of the line is not yet known. */
export const UNKNOWN_SPEED_START_SEC = 6;
const SAFETY = 1.15;

export interface PlayerFacts {
  duration: number;
  currentTime: number;
  /** Seconds of playback that can be shown without waiting for the network (held blocks, or what the browser itself holds). */
  aheadSec: number;
  targetSec: number;
  playing: boolean;
  /** The user pressed pause, so the player must not start again by itself. */
  userPaused: boolean;
  waiting: boolean;
  /** How fast the network delivers compared with how fast the video is played (2 = twice as fast); undefined while unknown. */
  speedRatio?: number;
  /** The seconds this wait is for, when they have been fixed for it (see `stabilizeNeeded`); else they are worked out from the speed. */
  neededSec?: number;
}

export type PlayerAction = "none" | "pause-for-buffer" | "resume";

/**
 * How many seconds of buffer a starting or stalled player waits for before it plays.
 * - A length the user chose: exactly that, or what is left of the video if that is less. The speed of the network does not matter.
 * - Auto: just what lets the rest play without stopping at the speed measured so far (buffered + speed * t >= t for every t up to the
 *   end means buffered >= (1 - speed) * remaining), with a margin and a floor of a few seconds, and never more than AUTO_MAX_WAIT_SEC
 *   or than what is left of the video.
 */
export function secondsNeeded(facts: Pick<PlayerFacts, "duration" | "currentTime" | "targetSec" | "speedRatio">): number {
  const remaining = Math.max(0, facts.duration - facts.currentTime);
  if (facts.targetSec !== AUTO_TARGET) return Math.min(facts.targetSec, remaining);
  const ratio = facts.speedRatio;
  const wanted = ratio === undefined
    ? UNKNOWN_SPEED_START_SEC
    : Math.max(MIN_START_SEC, (1 - ratio) * remaining * SAFETY);
  return Math.min(wanted, AUTO_MAX_WAIT_SEC, remaining);
}

/** How many seconds ahead of the play position to keep fetching. */
export function prefetchSeconds(targetSec: number): number {
  return targetSec === AUTO_TARGET ? AUTO_PREFETCH_SEC : targetSec;
}

/**
 * The seconds a wait is for, kept steady for as long as the wait lasts: the measured speed moves all the time, and "buffering 3 of 6",
 * then "3 of 9", then "4 of 5" is unreadable. The figure is rounded up to five seconds; it goes up only when the new one is clearly
 * higher (30 percent more, and at least five seconds) and it never goes down within a wait. The next wait starts from a fresh one.
 */
export function stabilizeNeeded(previous: number | undefined, computed: number): number {
  const rounded = Math.max(5, Math.ceil(computed / 5) * 5);
  if (previous === undefined) return rounded;
  if (computed >= previous * 1.3 && computed >= previous + 5) return rounded;
  return previous;
}

export function decideAction(facts: PlayerFacts): PlayerAction {
  if (!(facts.duration > 0)) return "none";
  const remaining = Math.max(0, facts.duration - facts.currentTime);
  if (facts.playing && !facts.waiting) {
    const nearTheEnd = remaining <= facts.aheadSec + 0.5;
    return facts.aheadSec < STALL_BELOW_SEC && !nearTheEnd ? "pause-for-buffer" : "none";
  }
  if (facts.waiting && !facts.userPaused) {
    return facts.aheadSec >= (facts.neededSec ?? secondsNeeded(facts)) - 0.25 ? "resume" : "none";
  }
  return "none";
}

/**
 * What to do the moment the user picks another length (or Auto): the new figure is worked out afresh, up or down, and then
 * - a video that is playing stops to wait if less than the new figure is on hand;
 * - a video that is waiting goes on if the new figure is already on hand;
 * - a video the user paused is left alone.
 * `facts.neededSec` must not be set: the figure of the old choice has to go.
 */
export function decideAfterTargetChange(facts: PlayerFacts): PlayerAction {
  if (!(facts.duration > 0) || facts.userPaused) return "none";
  const remaining = Math.max(0, facts.duration - facts.currentTime);
  const needed = secondsNeeded(facts);
  if (facts.playing && !facts.waiting) {
    const nearTheEnd = remaining <= facts.aheadSec + 0.5;
    return facts.aheadSec < needed - 0.25 && !nearTheEnd ? "pause-for-buffer" : "none";
  }
  return decideAction({ ...facts, neededSec: undefined });
}

/** Seconds of video the browser itself has loaded after `time`. */
export function nativeAheadSec(buffered: { length: number; start(i: number): number; end(i: number): number }, time: number): number {
  for (let i = 0; i < buffered.length; i++) {
    if (time >= buffered.start(i) - 0.1 && time <= buffered.end(i)) return buffered.end(i) - time;
  }
  return 0;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
