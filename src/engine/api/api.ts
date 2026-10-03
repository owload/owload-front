import { globalOptions } from "@/global-options";
import axios, { AxiosError, AxiosResponse } from "axios";

if (import.meta.env.MODE === "test" && import.meta.env.TEST_API_MODE === "REST") {
    axios.defaults.baseURL = import.meta.env.MAIN_API_URL;
    axios.interceptors.request.use(function (config) {
        config.headers['x-access-token'] = import.meta.env.MAIN_API_TEST_JWT;
        return config;
    });
} else {
    axios.defaults.baseURL = globalOptions.APP_MAIN_BACKEND_URL;
}

export async function getApiCall<T>(url: string, responseType: "json" | "arraybuffer" | "text" = "json", signal?: AbortSignal, retryCount = 0, timeout = 5000, delay = 1000): Promise<T> {
    return apiCall(url, "GET", responseType, retryCount, timeout, delay, undefined, signal);
}


export async function postApiCall<T, D>(url: string, data?: D, responseType: "json" | "arraybuffer" | "text" = "json", signal?: AbortSignal, retryCount = 0, timeout = 20000, delay = 1000): Promise<T> {
    return apiCall(url, "POST", responseType, retryCount, timeout, delay, data, signal);
}

export async function deleteApiCall<D = undefined>(url: string, data?: D, signal?: AbortSignal): Promise<void> {
    return apiCall(url, "DELETE", "json", 0, 10000, 1000, data, signal);
}

export async function patchApiCall<T, D>(url: string, data?: D, signal?: AbortSignal): Promise<T> {
    return apiCall(url, "PATCH", "json", 0, 10000, 1000, data, signal);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function waitForOnline() {
    return new Promise(resolve => {
        if (navigator.onLine) return resolve(undefined);
        window.addEventListener("online", resolve, { once: true });
    });
}

async function apiCall<T, D>(url: string, method: "GET" | "POST" | "DELETE" | "PATCH", responseType: "json" | "arraybuffer" | "text" = "json", retryCount: number, timeout: number, delay: number, data?: D, signal?: AbortSignal): Promise<T> {
    let res: AxiosResponse<T>;
    let attempt = 0;
    let lastError: unknown;
    while (attempt <= retryCount) {
        try {
            res = await makeProperAxiosApiCall<T, D>(url, method, responseType, timeout, data, signal);
            return res.data;
        } catch (e) {
            lastError = e;
            if (e instanceof AxiosError && !isRetryableError(e)) { throw e; }
            attempt++;
            if (typeof window !== "undefined" && !navigator.onLine) {
                await waitForOnline();
            } else {
                await sleep(delay);
            }
        }
    }
    // Re-throw the actual last failure (preserves e.response.status/data.detail
    // for the caller to show) instead of a synthetic message that discards it —
    // this is what happens once retries are exhausted, not just on the first try.
    throw lastError ?? new Error(`API call failed after ${attempt - 1} retries: ${method} ${url}`);
}

async function makeProperAxiosApiCall<T, D>(url: string, method: "GET" | "POST" | "DELETE" | "PATCH", responseType: "json" | "arraybuffer" | "text" = "json", timeout: number, data?: D, signal?: AbortSignal): Promise<AxiosResponse<T>> {
    switch (method) {
        case "GET":
            return axios.get(url, { responseType, signal, timeout });
        case "POST":
            return axios.post(url, data, { responseType, signal, timeout });
        case "DELETE":
            return axios.delete(url, { data, responseType, signal, timeout });
        case "PATCH":
            return axios.patch(url, data, { responseType, signal, timeout });
    }
}

function isRetryableError(err: AxiosError) {
    if (!err.response) return true;
    const s = err.response.status;
    return s >= 500 && s < 600;
}