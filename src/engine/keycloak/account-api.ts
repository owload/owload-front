import { getFreshAccessToken } from "@/auth-context-provider";
import { globalOptions } from "@/global-options";

/**
 * What the client asks of Keycloak's account API (the one its own account console uses), with the user's access token. Only
 * reads: the password itself is never typed into the client, it is changed on Keycloak's own page (see
 * `startPasswordChange` in auth-context-provider).
 */
const REQUEST_TIMEOUT_MS = 15_000;

/** What Keycloak says about the password of the user. */
export interface PasswordDetails {
    /** False for an account that signs in only through an identity provider (for example Google) and has no password. */
    registered: boolean;
    /** When the password was last set or changed (milliseconds since 1970); only with `registered`. */
    lastUpdate?: number;
}

interface CredentialContainer {
    type?: unknown;
    userCredentialMetadatas?: { credential?: { createdDate?: unknown } }[];
}

/**
 * The password of the account: whether there is one and when it was set. Resolves to undefined when Keycloak cannot say (it
 * is out of reach, the token may not use the account API, or this Keycloak does not offer it): the page then shows the
 * password row without a date. Only the status of a failure is logged.
 */
export async function getPasswordDetails(): Promise<PasswordDetails | undefined> {
    try {
        const token = await getFreshAccessToken();
        const url = `${globalOptions.APP_KEYCLOAK_URL}/realms/${globalOptions.APP_KEYCLOAK_REALM}/account/credentials?type=password`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            credentials: "omit",
            cache: "no-store",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!response.ok) {
            console.warn("Keycloak account API: status", response.status);
            return undefined;
        }
        const containers = await response.json() as CredentialContainer[];
        const created = (Array.isArray(containers) ? containers : [])
            .filter((container) => container.type === "password")
            .flatMap((container) => container.userCredentialMetadatas ?? [])
            .map((metadata) => metadata.credential?.createdDate)
            .filter((date): date is number => typeof date === "number");
        return created.length > 0 ? { registered: true, lastUpdate: Math.max(...created) } : { registered: false };
    } catch (e) {
        console.warn("Keycloak account API: no answer", e instanceof Error ? e.name : "error");
        return undefined;
    }
}
