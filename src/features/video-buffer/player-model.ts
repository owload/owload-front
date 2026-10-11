/** The pure part of the buffered player: what to do about the buffer, kept apart from React so that it can be tested. */

/** Seconds of playback that must be on hand before a stalled video is allowed to continue. */
export const STALL_BELOW_SEC = 2;
export const TARGET_OPTIONS: ReadonlyArray<{ label: string; seconds: number }> = [
  { label: "30 s", seconds: 30 },
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "All", seconds: Infinity },
];
export const DEFAULT_TARGET_SEC = 60;

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
}

export type PlayerAction = "none" | "pause-for-buffer" | "resume";

/**
 * How many seconds of buffer a stalled or starting player waits for. Not the whole target: just what lets the rest play without stopping
 * at the speed measured so far (buffered + speed * t >= t for every t up to the end means buffered >= (1 - speed) * remaining), with a
 * margin and a floor of a few seconds, and never more than the target the user chose or than what is left of the video.
 */
export function secondsNeeded(facts: Pick<PlayerFacts, "duration" | "currentTime" | "targetSec" | "speedRatio">): number {
  const remaining = Math.max(0, facts.duration - facts.currentTime);
  const ratio = facts.speedRatio;
  const wanted = ratio === undefined
    ? UNKNOWN_SPEED_START_SEC
    : Math.max(MIN_START_SEC, (1 - ratio) * remaining * SAFETY);
  return Math.min(wanted, facts.targetSec, remaining);
}

export function decideAction(facts: PlayerFacts): PlayerAction {
  if (!(facts.duration > 0)) return "none";
  const remaining = Math.max(0, facts.duration - facts.currentTime);
  if (facts.playing && !facts.waiting) {
    const nearTheEnd = remaining <= facts.aheadSec + 0.5;
    return facts.aheadSec < STALL_BELOW_SEC && !nearTheEnd ? "pause-for-buffer" : "none";
  }
  if (facts.waiting && !facts.userPaused) {
    return facts.aheadSec >= secondsNeeded(facts) - 0.25 ? "resume" : "none";
  }
  return "none";
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
