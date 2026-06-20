async function readFile(file: File | Blob): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
        let fr = new FileReader()
        fr.onload = async (e) => {
            resolve(e.target!.result as ArrayBuffer);
        }
        fr.readAsArrayBuffer(file);
    })
}

export async function generateImagePreviews(file: File, sizes: number[], quality = 0.7): Promise<{ [key: number]: Blob }> {
    let fileContents = await readFile(file);
    let blob = new Blob([fileContents], { type: file.type });
    let url = URL.createObjectURL(blob);
    sizes = [...sizes]; // copy then sort
    sizes.sort();
    return new Promise((resolve) => {
        const elemImg = document.createElement('img');
        const elemCanvas = document.createElement('canvas');
        elemImg.src = url;
        elemImg.onload = async () => {
            let results: { [key: number]: Blob } = {};
            for (let size of sizes) {
                const blob = await generatePreview(elemImg, elemCanvas, size, quality);
                results[size] = blob;
            }
            URL.revokeObjectURL(url);
            resolve(results);
        }
    })
}

export async function generateVideoPreviews(file: File, size: number, quality = 0.7): Promise<{ [key: number]: Blob }> {
    let fileContents = await readFile(file);
    let blob = new Blob([fileContents], { type: file.type });
    let url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const elemVideo = document.createElement('video');
        elemVideo.muted = true;
        elemVideo.preload = 'auto';
        const elemCanvas = document.createElement('canvas');

        // Attach to DOM so WKWebView decodes frames (off-screen elements may not)
        elemVideo.style.position = 'fixed';
        elemVideo.style.opacity = '0';
        elemVideo.style.pointerEvents = 'none';
        document.body.appendChild(elemVideo);

        function cleanup() {
            URL.revokeObjectURL(url);
            document.body.removeChild(elemVideo);
        }

        elemVideo.onloadedmetadata = () => {
            const dur = isFinite(elemVideo.duration) ? elemVideo.duration : 0;
            const ratio = elemVideo.videoWidth / elemVideo.videoHeight;
            let w: number, h: number;
            if (ratio < 1) {
                w = Math.min(elemVideo.videoWidth, size);
                h = Math.floor(w / ratio);
            } else {
                h = Math.min(elemVideo.videoHeight, size);
                w = Math.floor(h * ratio);
            }
            elemCanvas.width = w;
            elemCanvas.height = h;
            elemVideo.currentTime = dur > 0 ? dur / 3 : 0;
        };

        elemVideo.onseeked = () => {
            // WKWebView needs a couple of animation frames after seeked
            // before the frame is available for canvas capture
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const context = elemCanvas.getContext('2d');
                    if (!context) {
                        cleanup();
                        reject(new Error("Can't create canvas context"));
                        return;
                    }
                    context.drawImage(elemVideo, 0, 0, elemCanvas.width, elemCanvas.height);
                    elemCanvas.toBlob((blob) => {
                        cleanup();
                        if (!blob) {
                            reject(new Error("Can't read canvas data to blob"));
                            return;
                        }
                        const result = {} as { [key: number]: Blob };
                        result[size] = blob;
                        resolve(result);
                    }, 'image/jpeg', quality);
                });
            });
        };

        elemVideo.onerror = () => {
            cleanup();
            reject(new Error('Video load error'));
        };

        elemVideo.src = url;
    });
}

async function generatePreview(elemImg: HTMLImageElement, elemCanvas: HTMLCanvasElement, maxThumbnailSize: number, quality: number): Promise<Blob> {
    const context = elemCanvas.getContext('2d');
    if (!context) {
        throw new Error("Can't create canavas context");
    }
    const ratio = elemImg.width / elemImg.height;
    let w, h;
    if (ratio < 1) {
        w = Math.min(elemImg.width, maxThumbnailSize);
        h = Math.floor(w / ratio);
    } else {
        h = Math.min(elemImg.height, maxThumbnailSize);
        w = Math.floor(h * ratio);
    }
    elemImg.width = w;
    elemImg.height = h;
    elemCanvas.width = w;
    elemCanvas.height = h;

    context.drawImage(elemImg, 0, 0, w, h);
    return new Promise((resolve) => {
        elemCanvas.toBlob((blob) => {
            if (!blob) {
                throw new Error("Can't read canvas data to blob");
            }
            resolve(blob);
        }, 'image/jpeg', quality);
    });
}