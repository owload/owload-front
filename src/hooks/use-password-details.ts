import { useCallback, useEffect, useState } from "react";
import { getPasswordDetails, type PasswordDetails } from "@/engine/keycloak/account-api";

/**
 * Whether the account has a password and when it was last set, asked of Keycloak. `details` stays undefined while it loads and
 * when Keycloak cannot say (the password row is then shown without a date).
 */
export function usePasswordDetails() {
    const [details, setDetails] = useState<PasswordDetails | undefined>();
    const [loaded, setLoaded] = useState(false);

    const reload = useCallback(async () => {
        setDetails(await getPasswordDetails());
        setLoaded(true);
    }, []);

    useEffect(() => { void reload(); }, [reload]);

    return { details, loaded };
}
