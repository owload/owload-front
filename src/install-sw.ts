export function installServiceWorker() {
    if ('serviceWorker' in navigator) {
        ((sw: any) => {
            sw.register(
                import.meta.env.MODE === 'production' ? '/service-worker.js' : '/dev-sw.js?dev-sw',
                { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' }
            )
        })(navigator.serviceWorker);
    }
}