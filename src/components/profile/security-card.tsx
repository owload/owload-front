import { useState } from "react";
import { KeyRound, Laptop, ShieldCheck, Smartphone } from "lucide-react";
import { Field, PasswordInput, PasswordStrengthMeter, RepeatCheck, useFieldId } from "@/components/drives/new-drive/form-parts";
import { Badge, InfoRow, ProfileButton, ProfileCard } from "./profile-parts";
import { PLACEHOLDER_DEVICES, PLACEHOLDER_PASSWORD_CHANGED } from "./profile-placeholders";

/** The form for a new password. What is typed stays in this component and goes nowhere: changing the password is not connected yet. */
function ChangePasswordForm({ onClose }: { onClose: () => void }) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [repeat, setRepeat] = useState("");
    const currentId = useFieldId("profile-current-password");
    const nextId = useFieldId("profile-new-password");
    const repeatId = useFieldId("profile-repeat-password");
    const ready = current !== "" && next !== "" && next === repeat;

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); if (ready) onClose(); }}
            className="m-0 flex flex-col gap-3.5 rounded-xl border border-sunny-ink p-4"
        >
            <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound aria-hidden="true" className="size-4" strokeWidth={2} />
                <span>Change password</span>
            </div>
            <Field label="Current password" htmlFor={currentId}>
                <PasswordInput id={currentId} value={current} onChange={setCurrent} label="current password" autoComplete="current-password" autoFocus />
            </Field>
            <Field label="New password" htmlFor={nextId}>
                <PasswordInput id={nextId} value={next} onChange={setNext} label="new password" />
                <PasswordStrengthMeter password={next} okHint={null} />
            </Field>
            <Field label="Repeat new password" htmlFor={repeatId}>
                <PasswordInput id={repeatId} value={repeat} onChange={setRepeat} label="repeat new password" />
                <RepeatCheck password={next} repeat={repeat} />
            </Field>
            <div className="flex justify-end gap-2">
                <ProfileButton tone="ghost" size={44} onClick={onClose}>Cancel</ProfileButton>
                <ProfileButton tone="yellow" size={44} type="submit" disabled={!ready}>Update password</ProfileButton>
            </div>
        </form>
    );
}

/** The password, the two-step verification and the devices that are signed in. */
export function SecurityCard() {
    const [changingPassword, setChangingPassword] = useState(false);

    return (
        <ProfileCard title="Sign-in and security">
            <div className="flex flex-col gap-2">
                {changingPassword
                    ? <ChangePasswordForm onClose={() => setChangingPassword(false)} />
                    : (
                        <InfoRow
                            first
                            label="Password"
                            action={<ProfileButton tone="dark" onClick={() => setChangingPassword(true)}><KeyRound aria-hidden="true" className="size-4" strokeWidth={2.2} />Change</ProfileButton>}
                        >
                            {PLACEHOLDER_PASSWORD_CHANGED}
                        </InfoRow>
                    )}
                <InfoRow
                    first={changingPassword}
                    label="Two-step verification"
                    action={<ProfileButton>Turn on</ProfileButton>}
                >
                    <Badge>Off</Badge>
                    <span className="font-normal text-sunny-muted">A code from an app at sign-in</span>
                </InfoRow>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-sunny-line pt-3.5">
                <h3 className="m-0 mb-1 text-xs font-normal text-sunny-muted">Signed-in devices</h3>
                <ul className="m-0 flex list-none flex-col p-0">
                    {PLACEHOLDER_DEVICES.map((device) => {
                        const Icon = device.kind === "phone" ? Smartphone : Laptop;
                        return (
                            <li key={device.id} className="flex min-h-[52px] items-center gap-3 border-t border-sunny-line">
                                <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-sunny-field">
                                    <Icon className="size-[18px]" strokeWidth={2} />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-[13px] font-semibold">{device.name}</span>
                                    <span className="text-xs text-sunny-muted">{device.note}</span>
                                </span>
                                {device.current ? <Badge tone="green" check>Current</Badge> : <ProfileButton size={36}>Sign out</ProfileButton>}
                            </li>
                        );
                    })}
                </ul>
                <button type="button" className="flex min-h-9 cursor-pointer items-center self-start text-sm font-semibold text-sunny-ink underline underline-offset-4 outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2">
                    Sign out everywhere else
                </button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-sunny-field px-3.5 py-3 text-[13px] leading-normal text-sunny-text-on-yellow">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 flex-none" strokeWidth={2} />
                <span>The account password only signs you in. Each drive is encrypted with its own password.</span>
            </div>
        </ProfileCard>
    );
}
