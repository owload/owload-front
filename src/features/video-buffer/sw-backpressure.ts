/**
 * Keeps the page from pushing a whole video, decrypted, into the service worker's memory faster than the browser takes it. The worker
 * reports how many chunks it has handed to the browser (`responseDemand`); the page waits while too many are queued in the worker.
 * If the worker never reports (an older worker), the wait gives up after a while so playback is not stuck.
 */
export const MAX_QUEUED_CHUNKS = 8;
const GIVE_UP_MS = 3000;

const delivered = new Map<string, number>();
const wakeUp = new Map<string, () => void>();

export function noteDemand(requestId: string, deliveredChunks: number): void {
  delivered.set(requestId, deliveredChunks);
  wakeUp.get(requestId)?.();
}

export function releaseRequest(requestId: string): void {
  wakeUp.get(requestId)?.();
  wakeUp.delete(requestId);
  delivered.delete(requestId);
}

export async function waitForRoom(requestId: string, sentChunks: number): Promise<void> {
  for (;;) {
    const before = delivered.get(requestId) ?? 0;
    if (sentChunks - before <= MAX_QUEUED_CHUNKS) return;
    const progressed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => { wakeUp.delete(requestId); resolve(false); }, GIVE_UP_MS);
      wakeUp.set(requestId, () => { clearTimeout(timer); wakeUp.delete(requestId); resolve(true); });
    });
    if (!progressed || !delivered.has(requestId)) return; // given up, or the request was released
  }
}
