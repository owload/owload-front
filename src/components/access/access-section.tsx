import { useState } from "react";
import { Check, Copy, Link2, Lock, RefreshCw, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { initialsOf } from "@/components/profile/avatar-presets";
import { AvatarView } from "@/components/profile/user-avatar";
import type { AddPersonResult, DrivePerson } from "@/engine/backend/access-backend";
import type { DriveInfo, DriveRole, DriveVisibility } from "@/engine/backend/drive-backend";
import { useDriveAccess } from "@/hooks/use-drive-access";
import { cn } from "@/lib/utils";

const OPTIONS: { value: DriveVisibility, title: string, text: string, Icon: typeof Lock }[] = [
    { value: "private", title: "Private", text: "Only you can open this drive.", Icon: Lock },
    { value: "shared", title: "Shared", text: "You and the people you add.", Icon: Users },
    { value: "public", title: "Public", text: "Anyone with the link, no sign-in needed.", Icon: Link2 },
];

const ROLE_LABEL: Record<DriveRole, string> = { admin: "Admin", writer: "Writer", reader: "Reader" };
const MY_ROLE_TEXT: Record<string, string> = {
    admin: "an admin: you manage the people and the settings",
    writer: "a writer: you add and change files",
    reader: "a reader: you can only view",
};

function errorText(error: unknown): string {
    const data = (error as { response?: { data?: { detail?: unknown } } })?.response?.data;
    return typeof data?.detail === "string" ? data.detail : "That did not work. Try again.";
}

function PersonRow({ person, canChange, canRemoveAdmin, busy, onRole, onRemove }: {
    person: DrivePerson;
    canChange: boolean;
    canRemoveAdmin: boolean;
    busy: boolean;
    onRole: (role: DriveRole) => void;
    onRemove: () => void;
}) {
    const editable = canChange && (person.role !== "admin" || canRemoveAdmin);
    return (
        <li className="flex min-h-[50px] items-center gap-2.5">
            <AvatarView initials={initialsOf(person.name || person.email)} className="size-8 text-xs" />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold">{person.name || person.email}</span>
                {person.name && <span className="truncate text-xs text-muted-foreground">{person.email}</span>}
            </span>
            {person.status === "invited" && (
                <span className="flex h-6 flex-none items-center rounded-[7px] bg-sunny-yellow-soft px-[9px] text-[11px] font-semibold uppercase tracking-[0.08em] text-sunny-placeholder">Invited</span>
            )}
            {editable ? (
                <select
                    aria-label={`Role of ${person.email}`}
                    value={person.role}
                    disabled={busy}
                    onChange={(e) => onRole(e.target.value as DriveRole)}
                    className="h-9 flex-none rounded-lg border border-input bg-white pl-2.5 pr-1.5 text-[13px] font-semibold"
                >
                    {canRemoveAdmin && <option value="admin">Admin</option>}
                    {!canRemoveAdmin && person.role === "admin" && <option value="admin">Admin</option>}
                    <option value="writer">Writer</option>
                    <option value="reader">Reader</option>
                </select>
            ) : (
                <span className="flex h-6 flex-none items-center rounded-[7px] bg-sunny-field px-[9px] text-[11px] font-semibold uppercase tracking-[0.08em]">{ROLE_LABEL[person.role]}</span>
            )}
            {editable && (
                <button type="button" aria-label={`Remove ${person.email}`} title="Remove" disabled={busy} onClick={onRemove} className="flex size-9 flex-none cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
                    <X aria-hidden="true" className="size-4" />
                </button>
            )}
        </li>
    );
}

/**
 * Who can open the drive: private, shared with people (by email, with a role each) or public (anyone with a link, read-only, no
 * sign-in). The drive's password is not part of this: the people are told it by the owner, and a public link does not carry it.
 */
export function AccessSection({ driveInfo, onLeft }: { driveInfo: DriveInfo, onLeft: () => void }) {
    const { access, failed, setVisibility, resetLink, addPerson, changeRole, removePerson, leave } = useDriveAccess(driveInfo.id);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<DriveRole>("reader");
    const [added, setAdded] = useState<AddPersonResult | undefined>();
    const [copied, setCopied] = useState<"link" | "app" | undefined>();
    // Leaving "shared" takes everyone off the drive, so it is asked first when there is anyone.
    const [leaving, setLeaving] = useState<DriveVisibility | undefined>();

    const myRole = access?.myRole ?? driveInfo.myRole;
    const manages = myRole === "owner" || myRole === "admin";
    const isOwner = myRole === "owner";

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(undefined);
        try {
            await action();
        } catch (e) {
            setError(errorText(e));
        } finally {
            setBusy(false);
        }
    }

    async function copy(text: string, what: "link" | "app") {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
            setTimeout(() => setCopied(undefined), 2000);
        } catch {
            setError("The text could not be copied. Select it and copy it by hand.");
        }
    }

    if (!access) {
        return (
            <section className="space-y-3 rounded-2xl border border-sunny-line bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                <h2 className="m-0 text-[17px] font-semibold">Access</h2>
                {failed ? <p className="text-sm text-muted-foreground">The access to this drive could not be loaded.</p> : <Skeleton className="h-[120px] w-full rounded-xl" />}
            </section>
        );
    }

    if (!manages) {
        return (
            <section className="space-y-3 rounded-2xl border border-sunny-line bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                <h2 className="m-0 text-[17px] font-semibold">Access</h2>
                <p className="m-0 text-sm">
                    {driveInfo.ownerName || driveInfo.ownerEmail || "The owner"} shared this drive with you as {MY_ROLE_TEXT[myRole] ?? myRole}.
                </p>
                {error && <p role="alert" className="m-0 text-sm font-semibold text-[#b3261e]">{error}</p>}
                <Button variant="outline" size="sm" disabled={busy} onClick={() => run(async () => { await leave(); onLeft(); })}>Leave this drive</Button>
            </section>
        );
    }

    return (
        <section className="space-y-4 rounded-2xl border border-sunny-line bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
            <h2 className="m-0 text-[17px] font-semibold">Access</h2>

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" disabled={busy}>
                <legend className="pb-2 text-[13px] font-semibold">Visibility</legend>
                {OPTIONS.map(({ value, title, text, Icon }) => {
                    const selected = access.visibility === value;
                    return (
                        <label key={value} className={cn("flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-[7px]", selected ? "border-sunny-ink bg-sunny-yellow-soft" : "border-sunny-line bg-white hover:border-sunny-ink")}>
                            <input type="radio" name="visibility" value={value} checked={selected} onChange={() => {
                                if (access.visibility === "shared" && value !== "shared" && access.people.length > 0) setLeaving(value);
                                else void run(() => setVisibility(value));
                            }} className="m-0 size-[18px] flex-none accent-sunny-ink" />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-sm font-semibold">{title}</span>
                                <span className={cn("text-xs", selected ? "text-sunny-text-on-yellow" : "text-sunny-muted")}>{text}</span>
                            </span>
                            <Icon aria-hidden="true" className={cn("size-[18px] flex-none", selected ? "text-sunny-ink" : "text-sunny-muted")} strokeWidth={2} />
                        </label>
                    );
                })}
            </fieldset>

            {access.visibility === "private" && (
                <p className="m-0 text-xs leading-normal text-muted-foreground">To let other people in, make the drive shared.</p>
            )}

            {access.visibility === "public" && access.publicLink && (
                <div className="flex flex-col gap-2 rounded-xl bg-sunny-field p-3.5">
                    <span className="text-[13px] font-semibold">Link</span>
                    <div className="flex flex-wrap gap-2">
                        <Input readOnly value={access.publicLink} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-[1_1_220px] text-[13px]" />
                        <Button size="sm" variant="outline" onClick={() => void copy(access.publicLink!, "link")}>
                            {copied === "link" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied === "link" ? "Copied" : "Copy"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(resetLink)} title="The old link stops working">
                            <RefreshCw aria-hidden="true" />New link
                        </Button>
                    </div>
                    <p className="m-0 text-xs leading-normal text-muted-foreground">
                        The link opens the drive for reading without signing in. What is in it stays encrypted: the password is not in the link, so give it separately to the people you trust.
                    </p>
                </div>
            )}

            {access.visibility === "shared" && (
            <div className="flex flex-col gap-2.5">
                <h3 className="m-0 text-[13px] font-semibold">People with access</h3>
                <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => { setAdded(await addPerson(email, role)); setEmail(""); });
                    }}
                >
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email of the person to add" className="h-11 min-w-0 flex-[1_1_160px]" />
                    <select aria-label="Role for the new person" value={role} onChange={(e) => setRole(e.target.value as DriveRole)} className="h-11 flex-none rounded-lg border border-input bg-white pl-2.5 pr-1.5 text-[13px] font-semibold">
                        {isOwner && <option value="admin">Admin</option>}
                        <option value="writer">Writer</option>
                        <option value="reader">Reader</option>
                    </select>
                    <Button type="submit" disabled={busy || email.trim() === ""} className="h-11 flex-none">Add</Button>
                </form>
                {added && (
                    <p role="status" className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-normal">
                        <Check aria-hidden="true" className="size-3.5 flex-none text-sunny-green" strokeWidth={2.6} />
                        <span>
                            {added.person.status === "invited" ? "Invited" : "Added"} {added.person.email}.{" "}
                            {added.emailSent ? "They were told by email." : "No email went out: send them the address of the app."}
                        </span>
                        {!added.emailSent && (
                            <button type="button" onClick={() => void copy(added.appUrl, "app")} className="cursor-pointer font-semibold underline underline-offset-2">{copied === "app" ? "Copied" : "Copy the address"}</button>
                        )}
                    </p>
                )}
                <ul className="m-0 flex list-none flex-col p-0">
                    <li className="flex min-h-[50px] items-center gap-2.5">
                        <AvatarView initials="You" className="size-8 text-xs" />
                        <span className="min-w-0 flex-1 text-[13px] font-semibold">{isOwner ? "You" : driveInfo.ownerName || driveInfo.ownerEmail || "Owner"}</span>
                        <span className="flex h-6 flex-none items-center rounded-[7px] bg-sunny-field px-[9px] text-[11px] font-semibold uppercase tracking-[0.08em]">Owner</span>
                    </li>
                    {access.people.map((person) => (
                        <PersonRow
                            key={`${person.status}-${person.id}`}
                            person={person}
                            canChange
                            canRemoveAdmin={isOwner}
                            busy={busy}
                            onRole={(next) => void run(() => changeRole(person.id, next))}
                            onRemove={() => void run(() => removePerson(person.id))}
                        />
                    ))}
                </ul>
                <p className="m-0 text-xs leading-normal text-muted-foreground">
                    <b className="text-sunny-ink">Admin</b> manages people and settings. <b className="text-sunny-ink">Writer</b> adds and changes files. <b className="text-sunny-ink">Reader</b> only views.
                </p>
                <p className="m-0 text-xs leading-normal text-muted-foreground">
                    The drive is encrypted with its own password, which Owload never sees. People you add have to be told it by you, outside Owload: it is not in the invitation.
                </p>
            </div>
            )}
            {error && <p role="alert" className="m-0 text-sm font-semibold text-[#b3261e]">{error}</p>}

            <Dialog open={leaving !== undefined} onOpenChange={(open) => { if (!open) setLeaving(undefined); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Make the drive {leaving}?</DialogTitle>
                        <DialogDescription>
                            {access.people.length === 1 ? "The person" : `All ${access.people.length} people`} with access {access.people.length === 1 ? "is" : "are"} taken off the drive, and invitations that are not answered yet are cancelled.
                            If you share the drive again, they have to be added again.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setLeaving(undefined)}>Cancel</Button>
                        <Button
                            disabled={busy}
                            onClick={() => {
                                const next = leaving!;
                                setLeaving(undefined);
                                void run(() => setVisibility(next));
                            }}
                        >
                            Make {leaving}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
