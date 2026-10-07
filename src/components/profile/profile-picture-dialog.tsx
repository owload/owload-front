import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/drives/new-drive/form-parts";
import type { UserAvatar as UserAvatarValue } from "@/engine/backend/user-backend";
import { AVATAR_FILE_ACCEPT, prepareAvatarImage } from "@/lib/avatar-image";
import { cn } from "@/lib/utils";
import { AVATAR_PRESETS } from "./avatar-presets";
import { ProfileButton } from "./profile-parts";
import { AvatarView } from "./user-avatar";

/** What the picture is going to be: the initials, a preset, the image already uploaded, or a new upload. */
export type PictureChoice =
    | { kind: "initials" }
    | { kind: "preset", preset: string }
    | { kind: "keep" }
    | { kind: "upload", image: Blob, previewUrl: string };

interface ProfilePictureDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The picture the user has now. */
    avatar: UserAvatarValue;
    /** The object URL of the uploaded image the user has now, if there is one. */
    currentImageUrl?: string;
    initials: string;
    /** The name shown in the preview next to the small picture. */
    displayName: string;
    /** Saves the choice; rejects when it could not be saved. */
    onSave: (choice: PictureChoice) => Promise<void>;
}

const RING = "shadow-[0_0_0_1px_rgba(29,28,25,0.14)]";

function initialChoice(avatar: UserAvatarValue): PictureChoice {
    if (avatar.kind === "preset") return { kind: "preset", preset: avatar.preset };
    if (avatar.kind === "upload") return { kind: "keep" };
    return { kind: "initials" };
}

/**
 * The "Profile picture" dialog of the board: a preview, the user's own photo (dropped or chosen) and the presets. On a phone it
 * is a sheet at the bottom. Nothing changes until "Save picture".
 */
export function ProfilePictureDialog({ open, onOpenChange, avatar, currentImageUrl, initials, displayName, onSave }: ProfilePictureDialogProps) {
    const [choice, setChoice] = useState<PictureChoice>(() => initialChoice(avatar));
    const [error, setError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    // Start from the current picture each time the dialog is opened.
    useEffect(() => {
        if (open) {
            setChoice(initialChoice(avatar));
            setError(undefined);
            setSaving(false);
            setDragging(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // The preview of an upload is an object URL: let go of it when it is replaced or the dialog goes away.
    useEffect(() => {
        if (choice.kind !== "upload") return;
        const url = choice.previewUrl;
        return () => URL.revokeObjectURL(url);
    }, [choice]);

    const previewPreset = choice.kind === "preset" ? choice.preset : undefined;
    const previewImage = choice.kind === "upload" ? choice.previewUrl : choice.kind === "keep" ? currentImageUrl : undefined;
    const unchanged = choice.kind === "keep"
        || (choice.kind === "initials" && avatar.kind === "default")
        || (choice.kind === "preset" && avatar.kind === "preset" && avatar.preset === choice.preset);

    async function takeFile(file: File | undefined) {
        if (!file) return;
        setError(undefined);
        try {
            const image = await prepareAvatarImage(file);
            setChoice({ kind: "upload", image, previewUrl: URL.createObjectURL(image) });
        } catch (e) {
            setError(e instanceof Error ? e.message : "This picture cannot be used.");
        }
    }

    async function save() {
        setSaving(true);
        setError(undefined);
        try {
            await onSave(choice);
            onOpenChange(false);
        } catch {
            setError("The picture could not be saved. Try again.");
            setSaving(false);
        }
    }

    const preview = (size: string) => <AvatarView preset={previewPreset} imageUrl={previewImage} initials={initials} className={size} />;

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
            <DialogContent
                className={cn(
                    "flex w-[min(680px,calc(100%-32px))] max-w-none flex-col gap-4 p-[22px] sm:max-w-none md:gap-[18px]",
                    "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-[20px] max-md:px-4 max-md:pb-4 max-md:pt-2 max-md:shadow-[0_-10px_30px_rgba(0,0,0,0.22)]",
                    "max-h-[100dvh] overflow-y-auto",
                )}
            >
                <span aria-hidden="true" className="h-1 w-10 self-center rounded-full bg-[#d9d7cf] md:hidden" />
                <div className="flex flex-col gap-0.5 pr-8">
                    <DialogTitle className="text-xl font-semibold leading-tight">Profile picture</DialogTitle>
                    <DialogDescription className="text-sm text-sunny-muted">Shown in the top bar and to people you share drives with.</DialogDescription>
                </div>

                <div className="flex gap-5 max-md:flex-col max-md:gap-4">
                    <div className="flex items-center gap-3.5 md:w-[168px] md:flex-none md:flex-col md:justify-center md:rounded-[14px] md:bg-[#f6f6f3] md:px-3 md:py-[18px]">
                        <div className="md:order-2">{preview("size-20 md:size-28")}</div>
                        <div className="flex min-w-0 flex-col items-start gap-2 md:contents">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sunny-muted md:order-1">Preview</span>
                            <div className="flex min-w-0 max-w-full items-center gap-2 rounded-full bg-sunny-field py-1.5 pl-1.5 pr-3 md:order-3">
                                {preview("size-7")}
                                <span className="truncate text-[13px] font-semibold">{displayName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-[18px] max-md:gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-baseline justify-between gap-2.5">
                                <h3 className="m-0 text-[13px] font-semibold">Your photo</h3>
                                <span className="text-xs text-sunny-muted md:hidden">JPG, PNG or WebP</span>
                            </div>
                            <input
                                ref={fileInput}
                                type="file"
                                accept={AVATAR_FILE_ACCEPT}
                                className="sr-only"
                                tabIndex={-1}
                                aria-label="Choose a photo"
                                onChange={(e) => { void takeFile(e.target.files?.[0]); e.target.value = ""; }}
                            />
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setDragging(false); void takeFile(e.dataTransfer.files[0]); }}
                                className={cn("flex items-center gap-3.5 rounded-xl border border-dashed border-[#8f8d84] p-3.5 max-md:hidden", dragging && "border-sunny-ink bg-sunny-yellow-soft")}
                            >
                                <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-xl bg-sunny-field">
                                    <Upload className="size-5" strokeWidth={2} />
                                </span>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-sm font-semibold">Drag a photo here</span>
                                    <span className="text-xs text-sunny-muted">JPG, PNG or WebP</span>
                                </div>
                                <ProfileButton tone="dark" onClick={() => fileInput.current?.click()}>Choose file</ProfileButton>
                            </div>
                            <ProfileButton tone="dark" size={44} className="w-full md:hidden" onClick={() => fileInput.current?.click()}>
                                <ImagePlus aria-hidden="true" className="size-4" strokeWidth={2.2} />Choose a photo
                            </ProfileButton>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-baseline justify-between gap-2.5">
                                <h3 className="m-0 text-[13px] font-semibold">Or pick a preset</h3>
                                <span className="text-xs text-sunny-muted">Initials use your name</span>
                            </div>
                            <div role="radiogroup" aria-label="Preset pictures" className="grid grid-cols-[repeat(6,48px)] justify-between gap-y-3.5 md:grid-cols-[repeat(6,52px)] md:gap-y-4">
                                <PresetOption label="Initials" selected={choice.kind === "initials"} onSelect={() => { setChoice({ kind: "initials" }); setError(undefined); }}>
                                    <AvatarView initials={initials} className="size-full" />
                                </PresetOption>
                                {AVATAR_PRESETS.map((preset) => (
                                    <PresetOption key={preset.id} label={preset.label} selected={choice.kind === "preset" && choice.preset === preset.id} onSelect={() => { setChoice({ kind: "preset", preset: preset.id }); setError(undefined); }}>
                                        <AvatarView preset={preset.id} initials={initials} className="size-full" />
                                    </PresetOption>
                                ))}
                            </div>
                        </div>
                        {error && <FieldError>{error}</FieldError>}
                    </div>
                </div>

                <div className="flex items-center gap-2 border-t border-sunny-line pt-4">
                    <span className="flex-1 max-md:hidden" />
                    <ProfileButton tone="ghost" size={44} className="px-4" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</ProfileButton>
                    <ProfileButton tone="yellow" size={44} className="px-5 max-md:flex-1" onClick={() => void save()} disabled={saving || unchanged}>
                        <Check aria-hidden="true" className="size-4" strokeWidth={2.2} />{saving ? "Saving…" : "Save picture"}
                    </ProfileButton>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** A round option of the preset list: a ring around the chosen one and a check on it. */
export function PresetOption({ label, selected, onSelect, size = "full", children }: { label: string, selected: boolean, onSelect: () => void, size?: "full" | 40, children: React.ReactNode }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={onSelect}
            className={cn(
                "relative flex-none cursor-pointer rounded-full border-0 bg-transparent p-0 outline-sunny-ink focus-visible:outline-2 focus-visible:outline-offset-4",
                size === 40 ? "size-10" : "aspect-square w-full",
                selected ? "shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--sunny-ink)]" : RING,
            )}
        >
            {children}
            {selected && (
                <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-sunny-ink text-sunny-yellow">
                    <Check className="size-3" strokeWidth={3} />
                </span>
            )}
        </button>
    );
}
