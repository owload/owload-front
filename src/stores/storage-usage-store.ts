import { create } from "zustand";
import { getStorageUsage, type StorageUsage } from "@/engine/backend/storage-usage-backend";

const RECHECK_AFTER_MS = 3000;
const MAX_RECHECKS = 6;

interface StorageUsageStore {
    usage: StorageUsage | undefined;
    /** Asks the server again (one request at a time). While the server has not counted everything yet it asks again a few times. */
    refresh: () => Promise<void>;
}

let inFlight: Promise<void> | undefined;
let recheckTimer: ReturnType<typeof setTimeout> | undefined;
let rechecks = 0;

export const useStorageUsageStore = create<StorageUsageStore>((set, get) => ({
    usage: undefined,
    refresh: () => {
        inFlight ??= getStorageUsage()
            .then((usage) => {
                set({ usage });
                if (usage.complete) {
                    rechecks = 0;
                } else if (rechecks < MAX_RECHECKS && recheckTimer === undefined) {
                    rechecks++;
                    recheckTimer = setTimeout(() => {
                        recheckTimer = undefined;
                        void get().refresh();
                    }, RECHECK_AFTER_MS);
                }
            })
            .catch(() => undefined) // the usage is a nicety: a failed request leaves what is shown as it is
            .finally(() => { inFlight = undefined; });
        return inFlight;
    },
}));
