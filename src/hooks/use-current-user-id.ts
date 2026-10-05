import { RestUserBackend } from "@/engine/backend/user-backend";
import { useEffect, useState } from "react";

let currentUserId: Promise<string | undefined> | undefined;

/** The id of the signed-in user, fetched once; undefined until it arrives (or if it cannot be fetched). */
export function useCurrentUserId() {
    const [userId, setUserId] = useState<string | undefined>();
    useEffect(() => {
        currentUserId ??= new RestUserBackend().getUserBasicInfo().then((u) => u.userId).catch(() => undefined);
        let active = true;
        currentUserId.then((id) => active && setUserId(id));
        return () => { active = false; };
    }, []);
    return userId;
}
