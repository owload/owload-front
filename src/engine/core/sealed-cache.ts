/**
 * Encryption of a local cache value that is rewritten from time to time. The other caches encrypt every version of a value with the same
 * key and the same start of the keystream, so two versions of one cache give away what changed between them. This one starts every value at a
 * counter of its own, picked at random and kept in front of it, so the keystreams of two versions never coincide. The key is still the one
 * derived for this cache alone (decision 0035). Like the other caches it does not authenticate: it protects the value from being read.
 */
const COUNTER_BYTES = 16;
const COUNTER_BITS = 64;

export async function seal(key: CryptoKey, plaintext: Uint8Array): Promise<Uint8Array> {
    const counter = crypto.getRandomValues(new Uint8Array(COUNTER_BYTES));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CTR", counter, length: COUNTER_BITS }, key, plaintext as Uint8Array<ArrayBuffer>));
    const sealed = new Uint8Array(COUNTER_BYTES + encrypted.length);
    sealed.set(counter, 0);
    sealed.set(encrypted, COUNTER_BYTES);
    return sealed;
}

export async function open(key: CryptoKey, sealed: Uint8Array): Promise<Uint8Array> {
    if (sealed.length < COUNTER_BYTES) throw new Error("The cached value is too short");
    const counter = sealed.slice(0, COUNTER_BYTES);
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CTR", counter, length: COUNTER_BITS }, key, sealed.slice(COUNTER_BYTES) as Uint8Array<ArrayBuffer>));
}
