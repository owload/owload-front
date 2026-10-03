const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;

sw.addEventListener('install', async (event) => {
  console.log('service worker installing!', event);
  sw.skipWaiting();
});

// SW-level in-memory cache for decrypted video chunks (lives for the SW lifetime).
// Keyed by "${fileByteStart}_${rangeStart}_${rangeEnd}".
const videoChunkCache = new Map<string, Uint8Array>();
let videoChunkCacheBytes = 0;
const VIDEO_CHUNK_CACHE_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

function makeVideoCacheKey(fileStart: number, rangeStart: number, rangeEnd: number) {
  return `${fileStart}_${rangeStart}_${rangeEnd}`;
}

function evictVideoCache(neededBytes: number) {
  for (const [key, val] of videoChunkCache) {
    if (videoChunkCacheBytes + neededBytes <= VIDEO_CHUNK_CACHE_MAX_BYTES) break;
    videoChunkCacheBytes -= val.byteLength;
    videoChunkCache.delete(key);
  }
}

// Per-request state for push-based data transfer from the main page.
// The page pushes chunks eagerly; SW buffers them and serves to the browser on pull.
type ChunkResolver = (chunk: Uint8Array | null) => void;
type RequestState = {
  queue: Uint8Array[];
  resolve: ChunkResolver | null;
  done: boolean;
  cacheKey: string | null;      // set when this response should be cached on completion
  accumulated: Uint8Array[];    // accumulates chunks for the cache
};
const requestStates = new Map<string, RequestState>();

sw.addEventListener('message', (event) => {
  const { type, requestId, data } = event.data;
  const state = requestStates.get(requestId);
  if (!state) return;

  if (type === 'responseData') {
    if (state.cacheKey) {
      state.accumulated.push(data.slice()); // copy for cache; original goes to stream
    }
    if (state.resolve) {
      const r = state.resolve;
      state.resolve = null;
      r(data);
    } else {
      state.queue.push(data);
    }
  } else if (type === 'responseFinish') {
    if (state.cacheKey && state.accumulated.length > 0) {
      const totalSize = state.accumulated.reduce((s, c) => s + c.byteLength, 0);
      evictVideoCache(totalSize);
      const combined = new Uint8Array(totalSize);
      let off = 0;
      for (const c of state.accumulated) { combined.set(c, off); off += c.byteLength; }
      videoChunkCache.set(state.cacheKey, combined);
      videoChunkCacheBytes += totalSize;
    }
    if (state.resolve) {
      const r = state.resolve;
      state.resolve = null;
      r(null);
    } else {
      state.done = true;
    }
  }
});

async function getClientFetchReadableStream(clientId: string, byteOffset: number, byteLength: number, cacheKey: string | null = null): Promise<ReadableStream<Uint8Array>> {
  const requestId = Math.random().toString(36).substring(2);
  requestStates.set(requestId, { queue: [], resolve: null, done: false, cacheKey, accumulated: [] });

  const client = await sw.clients.get(clientId);
  if (!client) throw new Error('Client not found');

  // Tell the page to start pushing data immediately
  client.postMessage({ type: 'startClientFetch', requestId, data: { byteOffset, byteLength } });

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      return new Promise<void>((resolve) => {
        const state = requestStates.get(requestId);
        if (!state) {
          controller.close();
          resolve();
          return;
        }
        if (state.queue.length > 0) {
          controller.enqueue(state.queue.shift()!);
          resolve();
        } else if (state.done) {
          controller.close();
          requestStates.delete(requestId);
          resolve();
        } else {
          state.resolve = (chunk) => {
            if (chunk === null) {
              controller.close();
              requestStates.delete(requestId);
            } else {
              controller.enqueue(chunk);
            }
            resolve();
          };
        }
      });
    },
    cancel() {
      requestStates.delete(requestId);
      client.postMessage({ type: 'cancelClientFetch', requestId });
    },
  });
}

sw.addEventListener('fetch', async event => {
  if (!event.clientId) return;
  const url = new URL(event.request.url).toString();
  if (event.request.method === 'GET' && url.includes('/videorequest/')) {
    return event.respondWith(fetchWithDataDecrypt(event));
  }
});

function fetchWithDataDecrypt(event: FetchEvent) {
  // URL format: /videorequest/{mimeType}/{start}/{len}
  const len = +getUrlPathParam(event.request.url, 0);
  const start = +getUrlPathParam(event.request.url, 1);
  const mimeType = decodeURIComponent(getUrlPathParam(event.request.url, 2)) || 'video/mp4';

  const range = event.request.headers.get('range');
  if (range) {
    return respondPartial(event.clientId, start, len, range, mimeType);
  }
  return respondFully(event.clientId, start, len, mimeType);
}

function respondPartial(clientId: string, start: number, len: number, range: string, mimeType: string) {
  let rangeStart = 0;
  let rangeEnd = len - 1;
  if (range.startsWith('bytes=')) {
    const separatorIndex = range.indexOf('-');
    rangeStart = +range.substring(6, separatorIndex);
    const rangeEndStr = range.substring(separatorIndex + 1);
    if (rangeEndStr) rangeEnd = +rangeEndStr;
  }

  const chunkLength = rangeEnd - rangeStart + 1;
  const headers = {
    'Content-Type': mimeType,
    'Content-Length': String(chunkLength),
    'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${len}`,
    'Accept-Ranges': 'bytes',
  };

  const cacheKey = makeVideoCacheKey(start, rangeStart, rangeEnd);
  const cached = videoChunkCache.get(cacheKey);
  if (cached) {
    return new Response(cached, { headers, status: 206, statusText: 'Partial Content' });
  }

  return getClientFetchReadableStream(clientId, start + rangeStart, chunkLength, cacheKey).then(rs =>
    new Response(rs, { headers, status: 206, statusText: 'Partial Content' })
  );
}

function respondFully(clientId: string, start: number, len: number, mimeType: string) {
  const headers = {
    'Content-Type': mimeType,
    'Content-Length': String(len),
    'Accept-Ranges': 'bytes',
  };

  return getClientFetchReadableStream(clientId, start, len).then(rs =>
    new Response(rs, { headers, status: 200, statusText: 'OK' })
  );
}

function getUrlPathParam(url: string, iFromEnd: number) {
  if (url.endsWith('/')) url = url.substring(0, url.length - 1);
  const urlParts = url.split('/');
  return urlParts.reverse()[iFromEnd];
}
