import { useUserInfo } from "@/auth-context-provider";
import { useUserProfile } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";
import { initialsOf, PresetPicture } from "./avatar-presets";

/** A picture in a circle: the user's own image, a preset, or (with neither) the initials. */
export function AvatarView({ preset, initials, imageUrl, className }: { preset?: string, initials: string, imageUrl?: string, className?: string }) {
    return (
        <span aria-hidden="true" className={cn("relative flex size-10 flex-none overflow-hidden rounded-full", className)}>
            {imageUrl
                ? <img src={imageUrl} alt="" draggable={false} className="size-full object-cover" />
                : <PresetPicture preset={preset} initials={initials} />}
        </span>
    );
}

/** The name that the initials come from: the profile name, or else the email or the user name. */
export function useInitials(): string {
    const userInfo = useUserInfo();
    const { profile } = useUserProfile();
    return initialsOf(profile?.name || userInfo.fullName || profile?.email || userInfo.email || userInfo.name);
}

/** The picture of the signed-in user. Nothing is loaded from an identity provider: it is the user's upload, a chosen preset, or the initials. */
export function UserAvatar({ className }: { className?: string }) {
    const { profile, avatarUrl, status } = useUserProfile();
    const initials = useInitials();
    const avatar = profile?.avatar;
    // Until the profile arrives the picture is not known: show an empty circle instead of the initials that would then be replaced.
    if (status === "pending") return <span aria-hidden="true" className={cn("flex size-10 flex-none animate-pulse rounded-full bg-sunny-line", className)} />;
    return (
        <AvatarView
            preset={avatar?.kind === "preset" ? avatar.preset : undefined}
            imageUrl={avatar?.kind === "upload" ? avatarUrl : undefined}
            initials={initials}
            className={className}
        />
    );
}
