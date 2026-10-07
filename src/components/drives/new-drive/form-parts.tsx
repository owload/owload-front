import { Check, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { estimatePasswordStrength } from "./password-strength";

/** A card of the form: a numbered heading and the fields under it. */
export function FormSection({ number, title, aside, children }: { number: number, title: string, aside?: React.ReactNode, children: React.ReactNode }) {
    return (
        <section className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-sunny-line bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
            <div className="flex min-h-10 flex-wrap items-center gap-2.5">
                <span aria-hidden="true" className="flex size-6 flex-none items-center justify-center rounded-full bg-sunny-ink text-xs font-semibold text-sunny-yellow">{number}</span>
                <h2 className="m-0 text-[17px] font-semibold">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

/** A label over a field, the field itself being the child. */
export function Field({ label, htmlFor, children }: { label: string, htmlFor: string, children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={htmlFor} className="text-[13px] font-semibold">{label}</label>
            {children}
        </div>
    );
}

/** The message under a field that is not valid. */
export function FieldError({ children }: { children: string }) {
    return (
        <p role="alert" className="m-0 flex items-center gap-1.5 text-xs font-semibold text-[#b3261e]">
            <TriangleAlert aria-hidden="true" className="size-[13px]" strokeWidth={2.6} />
            <span>{children}</span>
        </p>
    );
}

/** A marker for a text the design leaves open (decision 0024, point 5). */
export function OpenText({ children }: { children: string }) {
    return <span className="rounded-md border border-dashed border-sunny-placeholder-edge px-1.5 py-px text-sunny-placeholder [box-decoration-break:clone]">{children}</span>;
}

/** A password field with a button that shows what was typed. */
export function PasswordInput({ id, value, onChange, label, invalid, autoComplete = "new-password", autoFocus, className }: { id: string, value: string, onChange: (value: string) => void, label: string, invalid?: boolean, autoComplete?: string, autoFocus?: boolean, className?: string }) {
    const [shown, setShown] = useState(false);
    return (
        <div className="relative flex">
            <Input id={id} type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} aria-invalid={invalid || undefined} className={cn("rounded-[10px] pr-11 text-sm", className)} />
            <button type="button" aria-label={`${shown ? "Hide" : "Show"} ${label}`} aria-pressed={shown} onClick={() => setShown(!shown)} className="absolute right-0.5 top-0.5 flex size-10 cursor-pointer items-center justify-center rounded-lg text-sunny-muted outline-sunny-ink hover:text-sunny-ink focus-visible:outline-2">
                {shown ? <EyeOff aria-hidden="true" className="size-[17px]" /> : <Eye aria-hidden="true" className="size-[17px]" />}
            </button>
        </div>
    );
}

const LEVEL_COLOR = { 1: "bg-[#b3261e]", 2: "bg-sunny-orange", 3: "bg-sunny-green" } as const;
const LEVEL_TEXT = { 1: "text-[#b3261e]", 2: "text-sunny-orange", 3: "text-sunny-green" } as const;

/** Three bars, the word for the level and a hint, under the password. */
export function PasswordStrengthMeter({ password, okHint = <>Encrypts this drive on your device. <OpenText>[WHAT HAPPENS IF THE PASSWORD IS LOST]</OpenText></> }: { password: string, okHint?: React.ReactNode }) {
    if (!password) return null;
    const { level, label, hint } = estimatePasswordStrength(password);
    return (
        <>
            <div role="status" aria-label={`Password strength: ${label.toLowerCase()}`} className="flex items-center gap-2.5">
                <div aria-hidden="true" className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= level ? LEVEL_COLOR[level] : "bg-sunny-line")} />)}
                </div>
                <span className={cn("min-w-12 flex-none text-right text-xs font-semibold", LEVEL_TEXT[level])}>{label}</span>
            </div>
            {(hint || okHint) && <p className="m-0 text-xs leading-normal text-sunny-muted">{hint || okHint}</p>}
        </>
    );
}

/** Tells whether the repeated password is the same. */
export function RepeatCheck({ password, repeat }: { password: string, repeat: string }) {
    if (!repeat) return null;
    const same = password === repeat;
    const Icon = same ? Check : TriangleAlert;
    return (
        <p role="status" className={cn("m-0 flex items-center gap-1.5 text-xs font-semibold", same ? "text-sunny-green" : "text-[#b3261e]")}>
            <Icon aria-hidden="true" className="size-[13px]" strokeWidth={2.6} />
            <span>{same ? "Passwords match" : "Passwords don’t match"}</span>
        </p>
    );
}

/** The generated id of a pair of label and field. */
export function useFieldId(name: string) {
    return `${name}-${useId()}`;
}
