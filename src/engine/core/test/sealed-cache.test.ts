import { describe, expect, it } from "vitest";
import { open, seal } from "../sealed-cache";

async function key() {
    return crypto.subtle.importKey("raw", crypto.getRandomValues(new Uint8Array(32)), "AES-CTR", false, ["encrypt", "decrypt"]);
}

describe("sealed cache", () => {
    it("gives back what was put in", async () => {
        const k = await key();
        const value = new TextEncoder().encode(JSON.stringify({ a: 1, b: "text", c: [1, 2, 3] }));
        expect(await open(k, await seal(k, value))).toEqual(value);
        expect(await open(k, await seal(k, new Uint8Array(0)))).toEqual(new Uint8Array(0));
    });

    it("does not show the plaintext, and gives another result every time", async () => {
        const k = await key();
        const value = new TextEncoder().encode("the same value, sealed twice");
        const a = await seal(k, value);
        const b = await seal(k, value);
        expect(a).not.toEqual(b);
        expect(a.length).toBe(value.length + 16);
        expect(new TextDecoder().decode(a.slice(16))).not.toContain("same value");
    });

    it("does not let two versions give away what changed: the keystreams differ", async () => {
        const k = await key();
        const one = new TextEncoder().encode("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        const two = new TextEncoder().encode("aaaaaaaaaaaaaaaaXaaaaaaaaaaaaaaa");
        const x = (await seal(k, one)).slice(16);
        const y = (await seal(k, two)).slice(16);
        const xor = x.map((byte, i) => byte ^ y[i]);
        expect(xor.filter((byte) => byte === 0).length).toBeLessThan(8); // with one keystream all but one byte would cancel to zero
    });

    it("cannot be opened with another key, and refuses a value that is too short", async () => {
        const sealed = await seal(await key(), new TextEncoder().encode("secret"));
        expect(new TextDecoder().decode(await open(await key(), sealed))).not.toBe("secret");
        await expect(open(await key(), new Uint8Array(5))).rejects.toThrow("too short");
    });
});
