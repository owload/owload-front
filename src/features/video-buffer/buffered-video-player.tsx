import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { FileProperties } from "@/types/types";
import { getBufferingBackend } from "./buffering-filesystem-backend";
import type { ByteRange, VideoBuffer } from "./video-buffer";
import { DEFAULT_TARGET_SEC, TARGET_OPTIONS, decideAction, formatTime, nativeAheadSec, secondsNeeded } from "./player-model";

const MIME_TYPES: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };
const TARGET_STORAGE_KEY = "owload.videoBuffer.target";
const RATES = [1, 1.25, 1.5, 2, 0.75];

function mimeOf(name: string): string {
  return MIME_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? "video/mp4";
}

function loadTarget(): number {
  try {
    const stored = localStorage.getItem(TARGET_STORAGE_KEY);
    if (stored === "inf") return Infinity;
    const n = Number(stored);
    if (TARGET_OPTIONS.some((o) => o.seconds === n)) return n;
  } catch {
    // storage may be blocked
  }
  return DEFAULT_TARGET_SEC;
}

interface Props {
  fileToPreview: FileProperties;
  onLoadedCallback?: () => void;
}

/** The experimental player: the browser decodes, we draw the controls and keep the buffer (decision 0031). Falls back to nothing if the layer is missing. */
export function BufferedVideoPlayer({ fileToPreview, onLoadedCallback }: Props) {
  const backend = getBufferingBackend();
  const start = fileToPreview.byteOffset!;
  const len = fileToPreview.byteLength!;

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<VideoBuffer | undefined>(undefined);
  const userPausedRef = useRef(false);
  const waitingRef = useRef(true);
  const targetRef = useRef(loadTarget());
  const loadedReportedRef = useRef(false);
  const speedRatioRef = useRef<number | undefined>(undefined);

  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaitingState] = useState(true);
  const [aheadSec, setAheadSec] = useState(0);
  const [held, setHeld] = useState<ByteRange[]>([]);
  const [targetSec, setTargetState] = useState(targetRef.current);
  const [muted, setMuted] = useState(true);
  const [rateIndex, setRateIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState(false);

  const setWaiting = useCallback((value: boolean) => {
    waitingRef.current = value;
    setWaitingState(value);
  }, []);

  // The buffer lives as long as the player.
  useEffect(() => {
    if (!backend) return;
    const buffer = backend.openBuffer(start, len);
    bufferRef.current = buffer;
    setReady(true);
    return () => {
      bufferRef.current = undefined;
      setReady(false);
      backend.closeBuffer(buffer);
    };
  }, [backend, start, len]);

  // Keep the buffer's window on the play position, and decide whether to pause for the buffer or go on.
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      const video = videoRef.current;
      const buffer = bufferRef.current;
      if (!video || !buffer || !(video.duration > 0)) return;
      const bytesPerSecond = len / video.duration;
      const playByte = video.currentTime * bytesPerSecond;
      const target = targetRef.current;
      buffer.setWindow(playByte, Number.isFinite(target) ? target * bytesPerSecond : len);
      const ahead = Math.max(buffer.heldAhead(playByte) / bytesPerSecond, nativeAheadSec(video.buffered, video.currentTime));
      const throughput = buffer.throughput();
      const speedRatio = throughput === undefined ? undefined : throughput / bytesPerSecond;
      speedRatioRef.current = speedRatio;
      setAheadSec(ahead);
      setHeld(buffer.heldRanges());
      const action = decideAction({
        duration: video.duration,
        currentTime: video.currentTime,
        aheadSec: ahead,
        targetSec: target,
        playing: !video.paused && !video.ended,
        userPaused: userPausedRef.current,
        waiting: waitingRef.current,
        speedRatio,
      });
      if (action === "pause-for-buffer") {
        video.pause();
        setWaiting(true);
      } else if (action === "resume") {
        setWaiting(false);
        void video.play().catch(() => {
          userPausedRef.current = true; // the browser refused to start by itself: wait for the user
        });
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [ready, len, setWaiting]);

  // Controls hide while playing; touching the screen shows them again.
  const showControls = useCallback(() => setControlsVisible(true), []);
  useEffect(() => {
    if (!controlsVisible || !playing || waiting) return;
    const timer = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [controlsVisible, playing, waiting, time]);

  // The media preview overlay swipes to the next file and closes on a vertical swipe: the controls must not take part in that.
  useEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    for (const type of ["touchstart", "touchmove", "touchend"]) el.addEventListener(type, stop);
    return () => { for (const type of ["touchstart", "touchmove", "touchend"]) el.removeEventListener(type, stop); };
  }, [ready]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || waitingRef.current) {
      userPausedRef.current = false;
      setWaiting(false); // pressing play means "now", whatever is buffered
      void video.play().catch(() => { userPausedRef.current = true; });
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  }

  function seekToClientX(clientX: number) {
    const video = videoRef.current;
    const bar = barRef.current;
    if (!video || !bar || !(video.duration > 0)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setTime(video.currentTime);
    if (!userPausedRef.current && !video.paused) {
      video.pause(); // wait for the new position to be buffered, like at the start
      setWaiting(true);
    }
  }

  function setTarget(seconds: number) {
    targetRef.current = seconds;
    setTargetState(seconds);
    try { localStorage.setItem(TARGET_STORAGE_KEY, Number.isFinite(seconds) ? String(seconds) : "inf"); } catch { /* storage may be blocked */ }
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (container?.requestFullscreen) {
      void container.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
    } else {
      video?.webkitEnterFullscreen?.(); // iPhones can only show the video itself in full screen
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const video = videoRef.current;
    if (!video) return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 5); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
    else if (e.key === "m") { video.muted = !video.muted; setMuted(video.muted); }
    else if (e.key === "f") { toggleFullscreen(); }
    showControls();
  }

  const needed = secondsNeeded({ duration, currentTime: time, targetSec, speedRatio: speedRatioRef.current });
  const showWaiting = waiting && !userPausedRef.current && !error;
  const playedPercent = duration > 0 ? (time / duration) * 100 : 0;
  const btn = "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white outline-sunny-yellow hover:bg-white/15 focus-visible:outline-2";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={showControls}
      onPointerDown={showControls}
      className="relative flex max-h-full max-w-full items-center justify-center bg-black outline-none select-none"
    >
      {error && <div className="absolute top-0 z-10 bg-sunny-ink/90 p-2 text-sm text-white">Media can not be played</div>}
      {ready && (
        <video
          ref={videoRef}
          className="max-h-full max-w-full"
          playsInline
          muted={muted}
          preload="auto"
          src={`/videorequest/${encodeURIComponent(mimeOf(fileToPreview.name))}/${start}/${len}`}
          onClick={togglePlay}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            if (!loadedReportedRef.current) { loadedReportedRef.current = true; onLoadedCallback?.(); }
          }}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onWaiting={(e) => {
            // the browser ran dry in the middle of playing: wait for the buffer instead of stuttering
            const video = e.currentTarget;
            if (!userPausedRef.current && !video.paused && video.readyState < 3 && video.currentTime > 0) { video.pause(); setWaiting(true); }
          }}
          onError={() => setError(true)}
        />
      )}

      {showWaiting && duration > 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
          <Loader2 className="size-9 animate-spin" aria-hidden="true" />
          <div className="rounded bg-sunny-ink/80 px-3 py-1 text-sm" role="status">
            Buffering: {formatTime(aheadSec)} of {formatTime(needed)}. Press play to start now.
          </div>
        </div>
      )}

      <div
        ref={controlsRef}
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-2 pt-8 pb-2 text-white transition-opacity ${controlsVisible || !playing || waiting ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          ref={barRef}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}, ${formatTime(aheadSec)} buffered ahead`}
          className="relative mx-1 h-6 cursor-pointer touch-none"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekToClientX(e.clientX); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) seekToClientX(e.clientX); }}
        >
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-sunny-ink-track">
            {held.map(([a, b]) => (
              <div key={a} className="absolute inset-y-0 bg-sunny-on-dark/60" style={{ left: `${(a / len) * 100}%`, width: `${((b - a) / len) * 100}%` }} />
            ))}
            <div className="absolute inset-y-0 left-0 bg-sunny-yellow" style={{ width: `${playedPercent}%` }} />
          </div>
          <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sunny-yellow" style={{ left: `${playedPercent}%` }} />
        </div>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <button type="button" aria-label={playing && !waiting ? "Pause" : "Play"} className={btn} onClick={togglePlay}>
            {playing && !waiting ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          </button>
          <div className="min-w-24 text-sm tabular-nums">{formatTime(time)} / {formatTime(duration)}</div>
          <button type="button" aria-label={muted ? "Unmute" : "Mute"} className={btn} onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
          </button>
          <button
            type="button"
            aria-label="Playback speed"
            className="h-11 min-w-11 cursor-pointer rounded-full px-2 text-sm text-white outline-sunny-yellow hover:bg-white/15 focus-visible:outline-2"
            onClick={() => {
              const next = (rateIndex + 1) % RATES.length;
              setRateIndex(next);
              if (videoRef.current) videoRef.current.playbackRate = RATES[next];
            }}
          >
            {RATES[rateIndex]}×
          </button>
          <div className="ml-auto flex items-center gap-1 text-xs" role="group" aria-label="Buffer ahead">
            <span className="hidden sm:inline text-sunny-on-dark">Buffer ahead</span>
            {TARGET_OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={o.seconds === targetSec}
                className={`h-8 min-w-9 cursor-pointer rounded-full px-2 outline-sunny-yellow focus-visible:outline-2 ${o.seconds === targetSec ? "bg-sunny-yellow text-sunny-ink" : "text-white hover:bg-white/15"}`}
                onClick={() => setTarget(o.seconds)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button type="button" aria-label={fullscreen ? "Exit full screen" : "Full screen"} className={btn} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize className="size-5" aria-hidden="true" /> : <Maximize className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
