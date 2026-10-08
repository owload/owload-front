import { DriveInfo } from "@/engine";

/** What the filter of the drives page tells apart: my own drives by who can open them, and the drives others shared with me. */
export type DriveKind = "private" | "shared" | "public" | "with-me";

export const DRIVE_KIND_LABEL: Record<DriveKind, string> = {
    private: "Private",
    shared: "Shared",
    public: "Public",
    "with-me": "Shared with me",
};

/**
 * A drive of someone else that I was let into is "shared with me" (whatever its visibility); one of mine is private, shared
 * with people, or public (also open to anyone with the link).
 */
export function getDriveKind(driveInfo: DriveInfo): DriveKind {
    if (driveInfo.myRole && driveInfo.myRole !== "owner") return "with-me";
    if (driveInfo.visibility === "public") return "public";
    if (driveInfo.visibility === "shared") return "shared";
    return "private";
}
