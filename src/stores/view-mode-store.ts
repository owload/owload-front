import { create } from "zustand";

export type ViewMode = "grid" | "list";

const STORAGE_KEY = "owload_view_mode";

function read(): ViewMode {
    try {
        return localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "grid";
    } catch {
        return "grid";
    }
}

/** How the files of a folder are shown. A per-device preference, kept in the browser only. */
export const useViewMode = create<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }>((set) => ({
    viewMode: read(),
    setViewMode: (viewMode) => {
        try {
            localStorage.setItem(STORAGE_KEY, viewMode);
        } catch {
            // the choice then lasts until the page is closed
        }
        set({ viewMode });
    },
}));
