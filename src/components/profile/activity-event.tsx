import { FolderMinus, FolderPlus, FolderSync, LogIn, LogOut, ShieldOff, Camera, UserPen, type LucideIcon } from "lucide-react";
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
        default: return { icon: LogIn, title: event.kind.replaceAll("_", " ") };
    }
}

/** Where the event came from: the browser, the address, and when. */
export function eventMeta(event: UserEvent): string {
    return [event.currentSession ? "This device" : event.device, event.ip, formatDateTime(event.at)].filter(Boolean).join(" · ");
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
