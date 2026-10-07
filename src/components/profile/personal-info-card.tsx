import { useState } from "react";
import { Camera, Check, Grid2x2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldError, useFieldId } from "@/components/drives/new-drive/form-parts";
import { useUserProfile } from "@/hooks/use-user-profile";
import { AVATAR_PRESETS, QUICK_PRESETS } from "./avatar-presets";
import { Badge, InfoRow, ProfileButton, ProfileCard } from "./profile-parts";
import { PresetOption, ProfilePictureDialog, type PictureChoice } from "./profile-picture-dialog";
import { AvatarView, UserAvatar, useInitials } from "./user-avatar";

/** "October 2026"; a dash until the date is known. */
function formatMemberSince(iso?: string): string {
    const date = iso ? new Date(iso) : undefined;
    if (!date || Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

interface PersonalInfoCardProps {
    /** The name from the sign-in with Google or another identity provider; empty after a plain registration. */
    name?: string;
    email?: string;
    emailVerified?: boolean;
    /** When the user started using Owload (an ISO date and time); undefined until the profile arrives. */
    memberSince?: string;
    /** Saves the name; rejects when it could not be saved. */
    onSaveName: (name: string) => Promise<void>;
}

/**
 * The picture, the name and the email: shown as a list, or as a form after "Edit". The name comes from the identity
 * provider and stays empty after a plain registration; the email cannot be changed. The picture is the initials by
 * default, then a preset or the user's own upload, chosen in the "Profile picture" dialog; it is never taken from the
 * identity provider.
 */
export function PersonalInfoCard({ name, email, emailVerified, memberSince, onSaveName }: PersonalInfoCardProps) {
    const { profile, avatarUrl, status, setAvatarPreset, uploadAvatar, resetAvatar } = useUserProfile();
    const initials = useInitials();
    const avatar = profile?.avatar ?? { kind: "default" as const };
    const [editing, setEditing] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [draftName, setDraftName] = useState(name ?? "");
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    const [pictureFailed, setPictureFailed] = useState(false);
    const nameId = useFieldId("profile-name");
    const emailId = useFieldId("profile-email");

    function startEditing() {
        setDraftName(name ?? "");
        setFailed(false);
        setEditing(true);
    }

    async function save() {
        setSaving(true);
        setFailed(false);
        try {
            await onSaveName(draftName.trim());
            setEditing(false);
        } catch {
            setFailed(true);
        } finally {
            setSaving(false);
        }
    }

    async function saveChoice(choice: PictureChoice) {
        if (choice.kind === "initials") await resetAvatar();
        else if (choice.kind === "preset") await setAvatarPreset(choice.preset);
        else if (choice.kind === "upload") await uploadAvatar(choice.image);
    }

    async function quickPick(preset: string) {
        setPictureFailed(false);
        try {
            await setAvatarPreset(preset);
        } catch {
            setPictureFailed(true);
        }
    }

    async function removePicture() {
        setPictureFailed(false);
        try {
            await resetAvatar();
        } catch {
            setPictureFailed(true);
        }
    }

    const dialog = (
        <ProfilePictureDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            avatar={avatar}
            currentImageUrl={avatarUrl}
            initials={initials}
            displayName={name ?? email ?? ""}
            onSave={saveChoice}
        />
    );

    if (editing) {
        return (
            <ProfileCard title="Personal info" action={<Badge>Editing</Badge>}>
                <form
                    onSubmit={(e) => { e.preventDefault(); void save(); }}
                    className="m-0 flex flex-col gap-3.5"
                >
                    <div className="flex items-center gap-3.5">
                        <UserAvatar className="size-16" />
                        <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap gap-2">
                                <ProfileButton tone="dark" onClick={() => setDialogOpen(true)}>
                                    <Camera aria-hidden="true" className="size-4" strokeWidth={2.2} />Change photo
                                </ProfileButton>
                                <ProfileButton tone="ghost" disabled={avatar.kind === "default"} onClick={() => void removePicture()}>Remove</ProfileButton>
                            </div>
                            <span className="text-xs text-sunny-muted">JPG, PNG or WebP.</span>
                        </div>
                    </div>
                    {pictureFailed && <FieldError>The picture could not be changed. Try again.</FieldError>}
                    <Field label="Name" htmlFor={nameId}>
                        <Input id={nameId} type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={255} placeholder="Your name" autoComplete="name" />
                    </Field>
                    <Field label="Email" htmlFor={emailId}>
                        <Input id={emailId} type="email" value={email ?? ""} readOnly disabled aria-describedby={`${emailId}-note`} />
                        <p id={`${emailId}-note`} className="m-0 text-xs leading-normal text-sunny-muted">The email is your sign-in address and can’t be changed.</p>
                    </Field>
                    {failed && <FieldError>The name could not be saved. Try again.</FieldError>}
                    <div className="flex justify-end gap-2 border-t border-sunny-line pt-3.5">
                        <ProfileButton tone="ghost" size={44} onClick={() => setEditing(false)} disabled={saving}>Cancel</ProfileButton>
                        <ProfileButton tone="yellow" size={44} type="submit" disabled={saving}><Check aria-hidden="true" className="size-4" strokeWidth={2.2} />{saving ? "Saving…" : "Save changes"}</ProfileButton>
                    </div>
                </form>
                {dialog}
            </ProfileCard>
        );
    }

    return (
        <ProfileCard
            title="Personal info"
            action={<ProfileButton tone="dark" onClick={startEditing}><Pencil aria-hidden="true" className="size-4" strokeWidth={2.2} />Edit</ProfileButton>}
        >
            <div className="flex min-w-0 items-center gap-3.5">
                <UserAvatar className="size-16 text-2xl" />
                <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[19px] font-semibold leading-tight">{name ?? email}</span>
                    {name && email && <span className="truncate text-[13px] text-sunny-muted">{email}</span>}
                </div>
            </div>

            {status === "pending" ? (
                <Skeleton className="h-11 w-full rounded-xl" />
            ) : avatar.kind === "default" ? (
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#8f8d84] p-3.5">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">No photo yet</span>
                        <span className="text-xs text-sunny-muted">Your initials are shown for now. Pick a preset or upload a photo.</span>
                    </div>
                    <div role="radiogroup" aria-label="Preset pictures" className="flex flex-wrap items-center gap-2">
                        {QUICK_PRESETS.map((id) => (
                            <PresetOption key={id} size={40} label={AVATAR_PRESETS.find((p) => p.id === id)!.label} selected={false} onSelect={() => void quickPick(id)}>
                                <AvatarView preset={id} initials={initials} className="size-10" />
                            </PresetOption>
                        ))}
                        <span className="ml-auto flex-none">
                            <ProfileButton tone="dark" onClick={() => setDialogOpen(true)}><Grid2x2 aria-hidden="true" className="size-4" strokeWidth={2.2} />All options</ProfileButton>
                        </span>
                    </div>
                    {pictureFailed && <FieldError>The picture could not be changed. Try again.</FieldError>}
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <ProfileButton tone="dark" onClick={() => setDialogOpen(true)}><Camera aria-hidden="true" className="size-4" strokeWidth={2.2} />Change picture</ProfileButton>
                    <ProfileButton tone="ghost" onClick={() => void removePicture()}>Use initials</ProfileButton>
                    {pictureFailed && <FieldError>The picture could not be changed. Try again.</FieldError>}
                </div>
            )}

            <div className="flex flex-col">
                <InfoRow first label="Name">{name ?? <span className="font-normal text-sunny-muted">Not set</span>}</InfoRow>
                <InfoRow label="Email">
                    {email ? <span className="break-all">{email}</span> : <span className="font-normal text-sunny-muted">Not provided</span>}
                    {email && emailVerified && <Badge tone="green" check>Verified</Badge>}
                </InfoRow>
                <InfoRow label="Member since">{formatMemberSince(memberSince)}</InfoRow>
            </div>
            {dialog}
        </ProfileCard>
    );
}
