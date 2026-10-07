/** The backend and the identity provider do not report these yet; the page shows fixed values, as the side panel does for the storage. */
export const PLACEHOLDER_PASSWORD_CHANGED = "Last changed Mar 4, 2026";
export const PLACEHOLDER_STORAGE_USED = "1.5 GB";
export const PLACEHOLDER_STORAGE_TOTAL = "3 GB";
export const PLACEHOLDER_STORAGE_PERCENT = 50;

export interface SignedInDevice {
    id: string;
    name: string;
    kind: "laptop" | "phone";
    note: string;
    current?: boolean;
}

export const PLACEHOLDER_DEVICES: SignedInDevice[] = [
    { id: "this", name: "MacBook Pro · Chrome", kind: "laptop", note: "This device · active now", current: true },
    { id: "phone", name: "iPhone · Safari", kind: "phone", note: "Last seen Feb 2, 19:32" },
];
