import { DriveInfo } from "@/engine";

/** What the "Private / Shared" filter of the drives page tells apart. */
export type DriveKind = "private" | "shared";

/**
 * A drive is shared when other people can reach it: it is one of mine that others can access, or it belongs to
 * someone else. The ACL comes from the API as a plain object keyed by user id (the declared `Map` type is not what
 * arrives), so both shapes are counted. Until the id of the current user is known only the ACL is looked at.
 */
export function getDriveKind(driveInfo: DriveInfo, currentUserId: string | undefined): DriveKind {
    if (currentUserId && driveInfo.ownerUserId !== currentUserId) {
        return "shared";
    }
    const acl = driveInfo.ACL as unknown;
    const sharedWith = acl instanceof Map ? acl.size : Object.keys((acl as object | undefined) ?? {}).length;
    return sharedWith > 0 ? "shared" : "private";
}
