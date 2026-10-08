import { Link2, Lock, Users } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FormSection } from "./form-parts";

type Visibility = "private" | "shared" | "public";

const OPTIONS: { value: Visibility, title: string, text: string, Icon: typeof Lock }[] = [
    { value: "private", title: "Private", text: "Only you can open this drive.", Icon: Lock },
    { value: "shared", title: "Shared", text: "You and the people you add.", Icon: Users },
    { value: "public", title: "Public", text: "Anyone with the link, no sign-in needed.", Icon: Link2 },
];

/**
 * Who can open the drive. A new drive is private; who else can open it (people, or anyone with a link) is set in the drive's
 * settings once it exists, so the other choices and the people list are shown here but cannot be used yet.
 */
export function AccessSection() {
    const [visibility] = useState<Visibility>("private");
    return (
        <FormSection
            number={2}
            title="Access"
            aside={<span className="ml-auto rounded-md bg-sunny-field px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sunny-muted">After creating</span>}
        >
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="pb-2 text-[13px] font-semibold">Visibility</legend>
                {OPTIONS.map(({ value, title, text, Icon }) => {
                    const selected = visibility === value;
                    return (
                        <label key={value} className={cn("flex min-h-[52px] items-center gap-3 rounded-xl border px-3.5 py-[7px]", selected ? "border-sunny-ink bg-sunny-yellow-soft" : "border-sunny-line bg-white opacity-60")}>
                            <input type="radio" name="visibility" value={value} checked={selected} disabled={!selected} readOnly className="m-0 size-[18px] flex-none accent-sunny-ink" />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-sm font-semibold">{title}</span>
                                <span className={cn("text-xs", selected ? "text-sunny-text-on-yellow" : "text-sunny-muted")}>{text}</span>
                            </span>
                            <Icon aria-hidden="true" className={cn("size-[18px] flex-none", selected ? "text-sunny-ink" : "text-sunny-muted")} strokeWidth={2} />
                        </label>
                    );
                })}
            </fieldset>

            <fieldset disabled className="m-0 flex flex-col gap-2.5 border-0 p-0">
                <legend className="pb-2.5 text-[13px] font-semibold">People with access</legend>
                <div className="flex flex-wrap gap-2 opacity-60">
                    <input type="email" placeholder="Email" aria-label="Email of the person to add" className="h-11 min-w-0 flex-[1_1_110px] rounded-[10px] border border-input bg-white px-3 text-sm" />
                    <select aria-label="Role for the new person" defaultValue="Reader" className="h-11 flex-none rounded-lg border border-input bg-white pl-2.5 pr-1.5 text-[13px] font-semibold">
                        <option>Admin</option><option>Writer</option><option>Reader</option>
                    </select>
                    <button type="button" className="flex h-11 flex-none items-center gap-1.5 rounded-[10px] bg-sunny-ink px-3.5 font-semibold text-sunny-yellow">Add</button>
                </div>
                <ul className="m-0 flex list-none flex-col p-0">
                    <li className="flex min-h-[50px] items-center gap-2.5">
                        <Avatar className="size-8 flex-none">
                            <AvatarImage src="/ava.jpg" />
                            <AvatarFallback>You</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 text-[13px] font-semibold">You</span>
                        <span className="flex h-6 flex-none items-center rounded-[7px] bg-sunny-field px-[9px] text-[11px] font-semibold uppercase tracking-[0.08em]">Owner</span>
                    </li>
                </ul>
                <p className="m-0 text-xs leading-normal text-sunny-muted">
                    <b className="text-sunny-ink">Admin</b> manages people and settings. <b className="text-sunny-ink">Writer</b> adds and changes files. <b className="text-sunny-ink">Reader</b> only views.
                </p>
                <p className="m-0 text-xs leading-normal text-sunny-muted">After the drive is created, add people in its settings. They are told the drive's password by you, outside Owload.</p>
            </fieldset>
        </FormSection>
    );
}
