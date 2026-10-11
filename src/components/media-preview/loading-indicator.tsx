import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/** Shown while a photo or a video is being fetched and decrypted. It appears after a moment so that a file that opens at once does not flash it. */
export function MediaLoadingIndicator({ label = "Loading" }: { label?: string }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 150);
        return () => clearTimeout(timer);
    }, []);
    return (
        <div role="status" aria-live="polite" className="pointer-events-none flex flex-col items-center gap-3">
            {visible && (
                <>
                    <Loader2 className="size-10 animate-spin text-sunny-yellow" strokeWidth={2.6} aria-hidden="true" />
                    <span className="rounded-full bg-sunny-yellow px-3 py-1 text-sm font-semibold text-sunny-text-on-yellow">{label}…</span>
                </>
            )}
            {!visible && <span className="sr-only">{label}</span>}
        </div>
    );
}
