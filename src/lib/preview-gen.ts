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
    return new Promise((resolve) => {
        const elemVideo = document.createElement('video');
        elemVideo.muted = true;
        const elemCanvas = document.createElement('canvas');
        elemVideo.style.transform = 'translateZ(0)';
        elemVideo.src = url;
        let w: number, h: number;
        elemVideo.onloadedmetadata = async () => {
            const ratio = elemVideo.videoWidth / elemVideo.videoHeight;
            if (ratio < 1) {
                w = Math.min(elemVideo.videoWidth, size);
                h = Math.floor(w / ratio);
            } else {
                h = Math.min(elemVideo.videoHeight, size);
                w = Math.floor(h * ratio);
            }
            elemCanvas.width = w;
            elemCanvas.height = h;
        };
        elemVideo.ontimeupdate = async () => {
            const context = elemCanvas.getContext('2d');
            if (!context) {
                throw new Error("Can't create canavas context");
            }
            elemVideo.pause();
            context.drawImage(elemVideo, 0, 0, w, h);
            // elemVideo.src = '';
            elemCanvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error("Can't read canvas data to blob");
                }
                const result = {} as { [key: number]: Blob };
                result[size] = blob;
                resolve(result);
            }, 'image/jpeg', quality);
        };

        elemVideo.addEventListener('loadedmetadata', function () {
            console.log('Duration:', elemVideo.duration);
            elemVideo.currentTime = Math.floor(elemVideo.duration / 3);
            elemVideo.play();
        });



    })

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