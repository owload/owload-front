/**
 * Decides when a "loading" placeholder is worth showing, so that it neither flashes nor drags: it appears only if loading goes on for
 * `delayMs` (a quick load shows the content at once and no placeholder at all), and once it has appeared it stays for at least `minShowMs`
 * (so that it does not blink away the moment it is drawn). It has no React in it; `useDelayedFlag` wires it to a component.
 */
export class DelayedFlag {
    private shown = false;
    private shownAt = 0;
    private showTimer: ReturnType<typeof setTimeout> | undefined;
    private hideTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly onChange: (shown: boolean) => void,
        private readonly delayMs: number,
        private readonly minShowMs: number,
        private readonly now: () => number = Date.now,
    ) {}

    setLoading(loading: boolean): void {
        if (loading) {
            if (this.hideTimer !== undefined) { // it was about to go away and loading started again: it stays
                clearTimeout(this.hideTimer);
                this.hideTimer = undefined;
            }
            if (!this.shown && this.showTimer === undefined) {
                this.showTimer = setTimeout(() => {
                    this.showTimer = undefined;
                    this.shown = true;
                    this.shownAt = this.now();
                    this.onChange(true);
                }, this.delayMs);
            }
            return;
        }
        if (this.showTimer !== undefined) { // loading ended before the placeholder was due: it never appears
            clearTimeout(this.showTimer);
            this.showTimer = undefined;
        }
        if (this.shown && this.hideTimer === undefined) {
            const remaining = this.minShowMs - (this.now() - this.shownAt);
            if (remaining <= 0) this.hide();
            else this.hideTimer = setTimeout(() => this.hide(), remaining);
        }
    }

    dispose(): void {
        if (this.showTimer !== undefined) clearTimeout(this.showTimer);
        if (this.hideTimer !== undefined) clearTimeout(this.hideTimer);
        this.showTimer = undefined;
        this.hideTimer = undefined;
    }

    private hide(): void {
        this.hideTimer = undefined;
        this.shown = false;
        this.onChange(false);
    }
}
