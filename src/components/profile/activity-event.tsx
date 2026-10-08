import { Camera, Crown, Database, Eye, Link2, Share2, UserCog, UserMinus, UserPlus, Users, FolderMinus, FolderOpen, FolderPlus, FolderSync, LogIn, LogOut, PenLine, ShieldOff, Trash2, UserPen, type LucideIcon } from "lucide-react";
import type { UserEvent } from "@/engine/backend/user-backend";
import { formatDateTime } from "@/lib/format-when";

interface EventView {
    icon: LucideIcon;
    title: string;
}

/** The words for an event of the account; a kind this client does not know is shown as it is. */
export function describeEvent(event: UserEvent): EventView {
    const drive = typeof event.details.title === "string" && event.details.title ? `“${event.details.title}”` : "a drive";
    switch (event.kind) {
        case "sign_in": return { icon: LogIn, title: "Signed in" };
        case "sign_out": return { icon: LogOut, title: "Signed out" };
        case "session_revoked": return { icon: ShieldOff, title: typeof event.details.device === "string" ? `Signed out ${event.details.device}` : "Signed out another device" };
        case "other_sessions_revoked": return { icon: ShieldOff, title: `Signed out ${Number(event.details.count) || "the"} other ${Number(event.details.count) === 1 ? "device" : "devices"}` };
        case "name_changed": return { icon: UserPen, title: "Name changed" };
        case "picture_changed": return { icon: Camera, title: "Profile picture changed" };
        case "drive_created": return { icon: FolderPlus, title: `Created ${drive}` };
        case "drive_restored": return { icon: FolderSync, title: `Restored ${drive} from a storage` };
        case "drive_deleted": return { icon: FolderMinus, title: `Deleted ${drive}` };
        case "drive_visibility_changed": return { icon: event.details.visibility === "public" ? Link2 : Users, title: `Made ${drive} ${typeof event.details.visibility === "string" ? event.details.visibility : "different"}${Number(event.details.removedPeople) > 0 ? `, which took ${Number(event.details.removedPeople)} ${Number(event.details.removedPeople) === 1 ? "person" : "people"} off it` : ""}` };
        case "drive_link_reset": return { icon: Link2, title: `New public link for ${drive}` };
        case "drive_person_added": return { icon: UserPlus, title: `Shared ${drive} with ${String(event.details.email ?? "someone")}${event.details.role ? ` as ${String(event.details.role)}` : ""}` };
        case "drive_person_invited": return { icon: UserPlus, title: `Invited ${String(event.details.email ?? "someone")} to ${drive}${event.details.role ? ` as ${String(event.details.role)}` : ""}` };
        case "drive_person_removed": return { icon: UserMinus, title: `Removed ${String(event.details.email ?? "someone")} from ${drive}` };
        case "drive_role_changed": return { icon: UserCog, title: `${String(event.details.email ?? "Someone")} is now ${String(event.details.role ?? "")} on ${drive}`.replace("  ", " ") };
        case "drive_shared_with_you": return { icon: Share2, title: `${drive} was shared with you${event.details.role ? ` as ${String(event.details.role)}` : ""}` };
        case "drive_left": return { icon: LogOut, title: `Left ${drive}` };
        case "drive_opened": return { icon: FolderOpen, title: `Read from ${drive}` };
        case "drive_files_read": return { icon: Eye, title: `Read files from ${drive}` };
        case "drive_written": return { icon: PenLine, title: `Wrote to ${drive}` };
        case "storage_target_added": return { icon: Database, title: `Added a storage to ${drive}` };
        case "storage_target_main_changed": return { icon: Crown, title: `Changed the main storage of ${drive}` };
        case "storage_target_removed": return { icon: Trash2, title: `Removed a storage from ${drive}` };
        default: return { icon: LogIn, title: event.kind.replaceAll("_", " ") };
    }
}

/** When it happened; for a burst of access to a drive, from when to when (the end as a time of day when it is the same day). */
function eventWhen(event: UserEvent): string {
    const start = formatDateTime(event.at);
    const lastAt = typeof event.details.lastAt === "string" ? new Date(event.details.lastAt) : undefined;
    const from = new Date(event.at);
    if (!lastAt || Number.isNaN(lastAt.getTime()) || lastAt.getTime() - from.getTime() < 2 * 60_000) return start;
    const sameDay = lastAt.toDateString() === from.toDateString();
    const end = sameDay ? formatDateTime(lastAt.toISOString()).split(", ").pop() : formatDateTime(lastAt.toISOString());
    return `${start} – ${end}`;
}

/** Where the event came from: the browser, the address, and when. */
export function eventMeta(event: UserEvent): string {
    return [event.currentSession ? "This device" : event.device, event.ip, eventWhen(event)].filter(Boolean).join(" · ");
}

/** One event of the account: an icon, what happened, and where it came from. */
export function ActivityEventRow({ event }: { event: UserEvent }) {
    const { icon: Icon, title } = describeEvent(event);
    return (
        <li className="flex min-h-[52px] items-center gap-3 border-t border-sunny-line first:border-t-0">
            <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-sunny-field">
                <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col py-1.5">
                <span className="break-words text-[13px] font-semibold">{title}</span>
                <span className="text-xs text-sunny-muted">{eventMeta(event)}</span>
            </span>
        </li>
    );
}
