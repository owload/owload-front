import { useEffect, useState } from "react";
import { Check, KeyRound, Laptop, ShieldCheck, Smartphone } from "lucide-react";
import { canChangePassword, clearKeycloakActionResult, getKeycloakActionResult, startPasswordChange } from "@/auth-context-provider";
import { FieldError } from "@/components/drives/new-drive/form-parts";
import type { PasswordDetails } from "@/engine/keycloak/account-api";
import { Skeleton } from "@/components/ui/skeleton";
import { describeLastSeen } from "@/lib/format-when";
import { usePasswordDetails } from "@/hooks/use-password-details";
import { useSessions } from "@/hooks/use-sessions";
import { Badge, InfoRow, ProfileButton, ProfileCard } from "./profile-parts";

/** "Last changed Mar 4, 2026"; nothing when the date is not known. */
function passwordCaption(details?: PasswordDetails): string | undefined {
    if (!details) return undefined;
    if (!details.registered) return "No password set";
    if (details.lastUpdate === undefined) return undefined;
    return `Last changed ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(details.lastUpdate))}`;
}

/** The sessions the user is signed in with: where from and when last seen, each other one with "Sign out". */
function SignedInDevices() {
    const { sessions, failed, revoke, revokeOthers } = useSessions();
    const [busy, setBusy] = useState<string | undefined>();
    const [error, setError] = useState(false);
    const others = (sessions ?? []).filter((session) => !session.current);

    async function run(key: string, action: () => Promise<void>) {
        setBusy(key);
        setError(false);
        try {
            await action();
        } catch {
            setError(true);
        } finally {
            setBusy(undefined);
        }
    }

    return (
        <div className="flex flex-col gap-1.5 border-t border-sunny-line pt-3.5">
            <h3 className="m-0 mb-1 text-xs font-normal text-sunny-muted">Signed-in devices</h3>
            {sessions === undefined
                ? (failed ? <p className="m-0 text-sm text-sunny-muted">The devices could not be loaded.</p> : <Skeleton className="h-[52px] w-full rounded-xl" />)
                : (
                    <ul className="m-0 flex list-none flex-col p-0">
                        {sessions.map((session) => {
                            const Icon = session.mobile ? Smartphone : Laptop;
                            return (
                                <li key={session.id} className="flex min-h-[52px] items-center gap-3 border-t border-sunny-line">
                                    <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-sunny-field">
                                        <Icon className="size-[18px]" strokeWidth={2} />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-[13px] font-semibold">{session.device}</span>
                                        <span className="text-xs text-sunny-muted">
                                            {session.current ? "This device · " : ""}{describeLastSeen(session.lastSeenAt)}{session.ip ? ` · ${session.ip}` : ""}
                                        </span>
                                    </span>
                                    {session.current
                                        ? <Badge tone="green" check>Current</Badge>
                                        : <ProfileButton size={36} disabled={busy !== undefined} onClick={() => void run(session.id, () => revoke(session.id))}>{busy === session.id ? "Signing out…" : "Sign out"}</ProfileButton>}
                                </li>
                            );
                        })}
                    </ul>
                )}
            {others.length > 0 && (
                <button
                    type="button"
                    disabled={busy !== undefined}
                    onClick={() => void run("others", revokeOthers)}
                    className="flex min-h-9 cursor-pointer items-center self-start text-sm font-semibold text-sunny-ink underline underline-offset-4 outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50"
                >
                    {busy === "others" ? "Signing out…" : "Sign out everywhere else"}
                </button>
            )}
            {error && <FieldError>The device could not be signed out. Try again.</FieldError>}
        </div>
    );
}

/** The password, the two-step verification and the devices that are signed in. */
export function SecurityCard() {
    const { details, loaded } = usePasswordDetails();
    // What Keycloak reported when it sent the user back (shown once).
    const [result] = useState(() => getKeycloakActionResult());
    useEffect(() => clearKeycloakActionResult, []);
    const passwordResult = result?.action === "UPDATE_PASSWORD" ? result.status : undefined;
    const canChange = canChangePassword();
    const caption = passwordCaption(details);

    return (
        <ProfileCard title="Sign-in and security">
            <div className="flex flex-col gap-2">
                <InfoRow
                    first
                    label="Password"
                    action={(
                        <ProfileButton
                            tone="dark"
                            disabled={!canChange}
                            title={canChange ? undefined : "Change the password in the web version"}
                            onClick={() => startPasswordChange()}
                        >
                            <KeyRound aria-hidden="true" className="size-4" strokeWidth={2.2} />{details?.registered === false ? "Set password" : "Change"}
                        </ProfileButton>
                    )}
                >
                    {caption ?? (loaded ? <span className="font-normal text-sunny-muted">Kept by the sign-in service</span> : "—")}
                </InfoRow>
                {passwordResult === "success" && (
                    <p role="status" className="m-0 flex items-center gap-1.5 text-xs font-semibold text-sunny-green">
                        <Check aria-hidden="true" className="size-[13px]" strokeWidth={2.6} />Password updated
                    </p>
                )}
                {passwordResult === "error" && <FieldError>The password was not changed. Try again.</FieldError>}
                <InfoRow
                    label="Two-step verification"
                    action={<ProfileButton disabled title="Not available yet">Turn on</ProfileButton>}
                >
                    <Badge>Off</Badge>
                    <span className="font-normal text-sunny-muted">A code from an app at sign-in</span>
                </InfoRow>
            </div>

            <SignedInDevices />

            <div className="flex items-start gap-2.5 rounded-xl bg-sunny-field px-3.5 py-3 text-[13px] leading-normal text-sunny-text-on-yellow">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 flex-none" strokeWidth={2} />
                <span>The account password only signs you in. Each drive is encrypted with its own password.</span>
            </div>
        </ProfileCard>
    );
}
