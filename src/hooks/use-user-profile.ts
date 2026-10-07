import { useEffect } from "react";
import { useUserProfileStore } from "@/stores/user-profile-store";

/**
 * The profile of the signed-in user kept by the backend: the email (always the sign-in one, it cannot be changed), the
 * name (from Google or another identity provider; empty after a plain registration) and the picture. Fetched on the
 * first use; `profile` is undefined until it arrives or if it cannot be fetched.
 */
export function useUserProfile() {
    const store = useUserProfileStore();
    const load = store.load;
    useEffect(() => { void load(); }, [load]);
    return store;
}
