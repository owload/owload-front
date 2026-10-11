/**
 * The experimental buffered video player (epic 0034, decision 0031) is one switch. To turn it off for everybody, set
 * `VITE_VIDEO_BUFFER=off` at build time (or flip DEFAULT_ENABLED below); to try either way in one browser, run in its console
 * `localStorage.setItem("owload.videoBuffer", "off")` (or "on") and reload. When it is off nothing of this folder is used:
 * the backend layer is not installed and the video opens with the browser's own controls as before.
 */
const STORAGE_KEY = "owload.videoBuffer";
const DEFAULT_ENABLED = true;

export function isVideoBufferEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "off") return false;
    if (stored === "on") return true;
  } catch {
    // storage may be blocked; the build default applies
  }
  if (import.meta.env.VITE_VIDEO_BUFFER === "off") return false;
  return DEFAULT_ENABLED;
}
