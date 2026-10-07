import { cn } from "@/lib/utils";

const INK = "#1d1c19";
const YELLOW = "#fadb58";
const GREY = "#e9e8e3";

/**
 * The preset pictures of the profile after the "Profile picture presets" board: flat shapes in yellow, black and grey,
 * drawn as SVG (nothing is loaded from the network). The ids are the ones the backend accepts (owload-back,
 * app/schemas/user.py). The initials of the user's name are the default and are not a preset: they are what is shown while
 * nothing is chosen.
 */
export const AVATAR_PRESETS = [
    { id: "rings", label: "Rings" },
    { id: "arcs", label: "Arcs" },
    { id: "split", label: "Split" },
    { id: "stripes", label: "Stripes" },
    { id: "dots", label: "Dots" },
    { id: "waves", label: "Waves" },
    { id: "cipher", label: "Cipher" },
    { id: "peaks", label: "Peaks" },
    { id: "keyhole", label: "Keyhole" },
    { id: "moon", label: "Moon" },
    { id: "bars", label: "Bars" },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

/** The presets offered next to the name before the full list is opened. */
export const QUICK_PRESETS: AvatarPresetId[] = ["rings", "arcs", "split", "stripes", "dots"];

/** Up to two capital letters of a name (or of an email or a user name), for the default picture. */
export function initialsOf(name: string): string {
    const letters = name.split(/[\s._@-]+/).filter(Boolean).map((part) => Array.from(part)[0].toUpperCase());
    return letters.slice(0, 2).join("") || "?";
}

const dotPositions = [8, 20, 32, 44, 56];
const stripeStarts = [-20, -4, 12, 28, 44, 60, 76];

const ART: Record<AvatarPresetId, React.ReactNode> = {
    rings: (
        <>
            <rect width="64" height="64" fill={YELLOW} />
            {[7, 17, 27, 37, 47].map((r) => <circle key={r} cx="46" cy="18" r={r} fill="none" stroke={INK} strokeWidth="2.5" />)}
        </>
    ),
    arcs: (
        <>
            <rect width="64" height="64" fill={INK} />
            {[14, 28, 42, 56].map((r) => <circle key={r} cx="0" cy="64" r={r} fill="none" stroke={YELLOW} strokeWidth="5" />)}
        </>
    ),
    split: (
        <>
            <rect width="64" height="64" fill={YELLOW} />
            <rect x="32" width="32" height="64" fill={INK} />
            <path d="M32 18a14 14 0 0 0 0 28z" fill={INK} />
            <path d="M32 18a14 14 0 0 1 0 28z" fill={YELLOW} />
        </>
    ),
    stripes: (
        <>
            <rect width="64" height="64" fill={INK} />
            <g transform="rotate(45 32 32)">
                {stripeStarts.map((x) => <rect key={x} x={x} y="-20" width="7" height="104" fill={YELLOW} />)}
            </g>
        </>
    ),
    dots: (
        <>
            <rect width="64" height="64" fill={YELLOW} />
            {dotPositions.flatMap((x) => dotPositions.map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={INK} />))}
        </>
    ),
    waves: (
        <>
            <rect width="64" height="64" fill={GREY} />
            {[20, 32, 44].map((y) => <path key={y} d={`M-4 ${y}q8-8 16 0t16 0t16 0t16 0t16 0`} fill="none" stroke={INK} strokeWidth="3.5" />)}
        </>
    ),
    cipher: (
        <>
            <rect width="64" height="64" fill={INK} />
            <text x="32" y="29" textAnchor="middle" fontFamily="ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace" fontSize="13" fontWeight="600" fill={YELLOW}>4F A9</text>
            <text x="32" y="45" textAnchor="middle" fontFamily="ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace" fontSize="13" fontWeight="600" fill="#8f8452">1C E2</text>
        </>
    ),
    peaks: (
        <>
            <rect width="64" height="64" fill={YELLOW} />
            <path d="M20 56l22-34 24 34z" fill="#c9a62b" />
            <path d="M-2 56l24-30 22 30z" fill={INK} />
        </>
    ),
    keyhole: (
        <>
            <rect width="64" height="64" fill={GREY} />
            <circle cx="32" cy="25" r="9" fill={INK} />
            <path d="M27.5 31h9l3.5 17h-16z" fill={INK} />
        </>
    ),
    moon: (
        <>
            <rect width="64" height="64" fill={INK} />
            <circle cx="30" cy="32" r="17" fill={YELLOW} />
            <circle cx="38" cy="27" r="15" fill={INK} />
        </>
    ),
    bars: (
        <>
            <rect width="64" height="64" fill={GREY} />
            <rect x="13" y="34" width="10" height="18" rx="2" fill={INK} />
            <rect x="27" y="24" width="10" height="28" rx="2" fill={INK} />
            <rect x="41" y="12" width="10" height="40" rx="2" fill={YELLOW} />
        </>
    ),
};

/** A picture of the board: a preset, or (when the id is missing or unknown) the initials on yellow. */
export function PresetPicture({ preset, initials, className }: { preset?: string, initials: string, className?: string }) {
    const art = AVATAR_PRESETS.some((p) => p.id === preset) ? ART[preset as AvatarPresetId] : undefined;
    return (
        <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("block size-full", className)}>
            {art ?? (
                <>
                    <rect width="64" height="64" fill={YELLOW} />
                    <text x="32" y="32" dy="0.35em" textAnchor="middle" fontSize={initials.length > 1 ? 24 : 28} fontWeight="600" fill={INK}>{initials}</text>
                </>
            )}
        </svg>
    );
}
