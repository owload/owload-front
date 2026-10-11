import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getApiCall, postApiCall } from "../api";

const originalAdapter = axios.defaults.adapter;

// a browser always knows it is online; some test environments have no such property, and the code then waits for an "online" event
beforeAll(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === undefined) {
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    }
});

function respondWith(statuses: number[]) {
    const calls: string[] = [];
    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
        calls.push(`${config.method} ${config.url}`);
        const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
        const response = { data: { ok: status < 400 }, status, statusText: String(status), headers: {}, config };
        if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config, undefined, response);
        return response;
    };
    axios.defaults.adapter = adapter;
    return calls;
}

afterEach(() => {
    axios.defaults.adapter = originalAdapter;
});

describe("reads that meet a gateway error", () => {
    it("try again, and succeed when the next try is answered", async () => {
        const calls = respondWith([502, 503, 200]);
        await expect(getApiCall<{ ok: boolean }>("/userinfo", "json", undefined, 0, 5000, 1)).resolves.toEqual({ ok: true });
        expect(calls).toHaveLength(3);
    });

    it("give up after two more tries and show the error", async () => {
        const calls = respondWith([502]);
        await expect(getApiCall("/drives", "json", undefined, 0, 5000, 1)).rejects.toThrow("502");
        expect(calls).toHaveLength(3);
    });

    it("do not repeat an error of the application itself", async () => {
        const calls = respondWith([500]);
        await expect(getApiCall("/drives", "json", undefined, 0, 5000, 1)).rejects.toThrow("500");
        expect(calls).toHaveLength(1);
    });

    it("do not repeat a refusal", async () => {
        const calls = respondWith([403]);
        await expect(getApiCall("/drives", "json", undefined, 0, 5000, 1)).rejects.toThrow("403");
        expect(calls).toHaveLength(1);
    });
});

describe("writes", () => {
    it("are not repeated after a gateway error", async () => {
        const calls = respondWith([502]);
        await expect(postApiCall("/drives", { a: 1 }, "json", undefined, 0, 5000, 1)).rejects.toThrow("502");
        expect(calls).toHaveLength(1);
    });
});
