import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@/auth-context-provider", () => ({ getFreshAccessToken: vi.fn(async () => "test-token") }));
vi.mock("@/global-options", () => ({
    globalOptions: { APP_KEYCLOAK_URL: "https://kc.test", APP_KEYCLOAK_REALM: "realm" },
}));

import { getPasswordDetails } from "../account-api";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => { vi.stubGlobal("fetch", fetchMock); vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { fetchMock.mockReset(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("asks the account API for the password credentials, with the access token and without cookies", async () => {
    fetchMock.mockResolvedValue(json(200, []));
    await getPasswordDetails();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://kc.test/realms/realm/account/credentials?type=password");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    expect(init?.credentials).toBe("omit");
    expect(init?.method).toBeUndefined();
});

test("a password credential gives the date it was set", async () => {
    fetchMock.mockResolvedValue(json(200, [
        { type: "password", userCredentialMetadatas: [{ credential: { id: "1", createdDate: 1772582400000 } }] },
        { type: "otp", userCredentialMetadatas: [{ credential: { createdDate: 1999999999999 } }] },
    ]));
    expect(await getPasswordDetails()).toEqual({ registered: true, lastUpdate: 1772582400000 });
});

test("an account without a password credential is reported as having none", async () => {
    fetchMock.mockResolvedValue(json(200, [{ type: "password", userCredentialMetadatas: [] }]));
    expect(await getPasswordDetails()).toEqual({ registered: false });
});

test("when Keycloak cannot say, the answer is undefined and only the status is logged", async () => {
    for (const status of [401, 403, 404, 500]) {
        fetchMock.mockResolvedValueOnce(json(status, { errorMessage: "secret details" }));
        expect(await getPasswordDetails()).toBeUndefined();
    }
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await getPasswordDetails()).toBeUndefined();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("secret");
});
