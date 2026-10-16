/**
 * A small cache of finished pictures (an address of a picture for each file), kept so that going back to a photo that was just seen is
 * instant. The oldest is dropped when there are more than `capacity`, and its address is released. A photo that is being made is made
 * once, however many ask for it. A failure is not remembered: the next ask tries again.
 */
export class PhotoCache {
    private readonly ready = new Map<string, string>();
    private readonly making = new Map<string, Promise<string>>();

    constructor(
        private readonly capacity: number,
        private readonly release: (url: string) => void,
    ) {}

    /** The address of the picture of `key`, made with `make` if it is not there yet. */
    get(key: string, make: () => Promise<string>): Promise<string> {
        const cached = this.ready.get(key);
        if (cached !== undefined) {
            this.ready.delete(key); // used just now: it is the newest
            this.ready.set(key, cached);
            return Promise.resolve(cached);
        }
        const pending = this.making.get(key);
        if (pending) return pending;
        const promise = make()
            .then((url) => {
                this.ready.set(key, url);
                this.trim();
                return url;
            })
            .finally(() => this.making.delete(key));
        this.making.set(key, promise);
        return promise;
    }

    has(key: string): boolean {
        return this.ready.has(key) || this.making.has(key);
    }

    clear(): void {
        for (const url of this.ready.values()) this.release(url);
        this.ready.clear();
    }

    private trim(): void {
        while (this.ready.size > this.capacity) {
            const [oldestKey, oldestUrl] = this.ready.entries().next().value as [string, string];
            this.ready.delete(oldestKey);
            this.release(oldestUrl);
        }
    }
}
