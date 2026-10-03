export async function setCachedValue<T extends Uint8Array | string>(cacheName: string, key: string, value: T) {
  if(typeof caches === 'undefined') {
    return;
  }
  const cache = await caches.open(cacheName);
  await cache.put(key, new Response(value));
}

export async function getCachedUint8Value(cacheName: string, key: string) {
  if(typeof caches === 'undefined') {
    return undefined;
  }
  const cache = await caches.open(cacheName);
  const response = await cache.match(key);
  if (response) {
    return new Uint8Array(await response.arrayBuffer());
  }
}

export async function getCachedStringValue(cacheName: string, key: string) {
  if(typeof caches === 'undefined') {
    return undefined;
  }
  const cache = await caches.open(cacheName);
  const response = await cache.match(key);
  if (response) {
    return response.text();
  }
}
