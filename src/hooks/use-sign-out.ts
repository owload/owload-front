import { useCallback } from "react";
import { useLogout } from "@/auth-context-provider";
import { RestUserBackend } from "@/engine/backend/user-backend";

/** Signing out waits this long at most for the backend to note it. */
const NOTE_TIMEOUT_MS = 1500;

/** Signs the user out of this device: the backend is told first (so the sign-out shows in the account activity), then Keycloak. */
export function useSignOut() {
    const logout = useLogout();
    return useCallback(async () => {
        try {
            await Promise.race([
                new RestUserBackend().endCurrentSession(),
                new Promise((resolve) => setTimeout(resolve, NOTE_TIMEOUT_MS)),
            ]);
        } catch {
            // The sign-out must not depend on the backend being reachable.
        }
        logout();
    }, [logout]);
}
