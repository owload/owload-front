import { useCallback, useEffect, useState } from "react";
import { RestUserBackend, type UserSession } from "@/engine/backend/user-backend";

const backend = new RestUserBackend();

/** The sessions the user is signed in with, and signing the others out. `sessions` is undefined until they arrive. */
export function useSessions() {
    const [sessions, setSessions] = useState<UserSession[] | undefined>();
    const [failed, setFailed] = useState(false);

    const reload = useCallback(async () => {
        try {
            setSessions(await backend.getSessions());
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, []);

    useEffect(() => { void reload(); }, [reload]);

    /** Signs one other session out; rejects when it could not be. */
    const revoke = useCallback(async (sessionId: string) => {
        await backend.revokeSession(sessionId);
        await reload();
    }, [reload]);

    /** Signs out every session but this one; rejects when it could not be. */
    const revokeOthers = useCallback(async () => {
        await backend.revokeOtherSessions();
        await reload();
    }, [reload]);

    return { sessions, failed, reload, revoke, revokeOthers };
}
