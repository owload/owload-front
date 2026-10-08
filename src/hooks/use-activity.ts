import { useCallback, useEffect, useState } from "react";
import { RestUserBackend, type UserEvent } from "@/engine/backend/user-backend";

const backend = new RestUserBackend();

/** The events of the user's account, newest first, `pageSize` at a time; `kinds` limits them to some kinds (the list reloads when it changes). */
export function useActivity(options: { kinds?: string[], pageSize?: number } = {}) {
    const { kinds, pageSize = 10 } = options;
    const kindsKey = kinds?.join(",");
    const [events, setEvents] = useState<UserEvent[] | undefined>();
    const [next, setNext] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async (before?: number) => {
        setLoading(true);
        try {
            const page = await backend.getActivity(pageSize, before, kindsKey ? kindsKey.split(",") : undefined);
            setEvents((current) => (before === undefined ? page.items : [...(current ?? []), ...page.items]));
            setNext(page.next);
            setFailed(false);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [pageSize, kindsKey]);

    useEffect(() => {
        setEvents(undefined);
        setNext(null);
        void load();
    }, [load]);

    return { events, failed, loading, hasMore: next !== null, loadMore: () => (next !== null ? load(next) : Promise.resolve()), reload: () => load() };
}
