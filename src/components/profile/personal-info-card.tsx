import { useState } from "react";
import { Camera, Check, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Field, useFieldId } from "@/components/drives/new-drive/form-parts";
import { Badge, InfoRow, ProfileButton, ProfileCard } from "./profile-parts";
import { PLACEHOLDER_MEMBER_SINCE } from "./profile-placeholders";

interface PersonalInfoCardProps {
    /** The name from the sign-in with Google or another identity provider; empty after a plain registration. */
    name?: string;
    email?: string;
    emailVerified?: boolean;
    avatarSrc: string;
    initials: string;
}

/**
 * The name, the email and the photo: shown as a list, or as a form after "Edit". The name comes from the identity provider
 * and stays empty after a plain registration; the email cannot be changed. Saving is not connected yet.
 */
export function PersonalInfoCard({ name, email, emailVerified, avatarSrc, initials }: PersonalInfoCardProps) {
    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(name ?? "");
    const nameId = useFieldId("profile-name");
    const emailId = useFieldId("profile-email");

    function startEditing() {
        setDraftName(name ?? "");
        setEditing(true);
    }

    if (editing) {
        return (
            <ProfileCard title="Personal info" action={<Badge>Editing</Badge>}>
                <form
                    onSubmit={(e) => { e.preventDefault(); setEditing(false); }}
                    className="m-0 flex flex-col gap-3.5"
                >
                    <div className="flex items-center gap-3.5">
                        <Avatar className="size-16">
                            <AvatarImage src={avatarSrc} alt="Your photo" />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap gap-2">
                                <ProfileButton tone="dark"><Camera aria-hidden="true" className="size-4" strokeWidth={2.2} />Change photo</ProfileButton>
                                <ProfileButton tone="ghost">Remove</ProfileButton>
                            </div>
                            <span className="text-xs text-sunny-muted">JPG or PNG, up to 2 MB.</span>
                        </div>
                    </div>
                    <Field label="Name" htmlFor={nameId}>
                        <Input id={nameId} type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Your name" autoComplete="name" />
                    </Field>
                    <Field label="Email" htmlFor={emailId}>
                        <Input id={emailId} type="email" value={email ?? ""} readOnly disabled aria-describedby={`${emailId}-note`} />
                        <p id={`${emailId}-note`} className="m-0 text-xs leading-normal text-sunny-muted">The email is your sign-in address and can’t be changed.</p>
                    </Field>
                    <div className="flex justify-end gap-2 border-t border-sunny-line pt-3.5">
                        <ProfileButton tone="ghost" size={44} onClick={() => setEditing(false)}>Cancel</ProfileButton>
                        <ProfileButton tone="yellow" size={44} type="submit"><Check aria-hidden="true" className="size-4" strokeWidth={2.2} />Save changes</ProfileButton>
                    </div>
                </form>
            </ProfileCard>
        );
    }

    return (
        <ProfileCard
            title="Personal info"
            action={<ProfileButton tone="dark" onClick={startEditing}><Pencil aria-hidden="true" className="size-4" strokeWidth={2.2} />Edit</ProfileButton>}
        >
            <div className="flex min-w-0 items-center gap-3.5">
                <Avatar className="size-16 flex-none">
                    <AvatarImage src={avatarSrc} alt="" />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[19px] font-semibold leading-tight">{name ?? email}</span>
                    {name && email && <span className="truncate text-[13px] text-sunny-muted">{email}</span>}
                </div>
            </div>
            <div className="flex flex-col">
                <InfoRow first label="Name">{name ?? <span className="font-normal text-sunny-muted">Not set</span>}</InfoRow>
                <InfoRow label="Email">
                    {email ? <span className="break-all">{email}</span> : <span className="font-normal text-sunny-muted">Not provided</span>}
                    {email && emailVerified && <Badge tone="green" check>Verified</Badge>}
                </InfoRow>
                <InfoRow label="Member since">{PLACEHOLDER_MEMBER_SINCE}</InfoRow>
            </div>
        </ProfileCard>
    );
}
