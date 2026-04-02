import { useEnqueueFileUpload } from "./use-upload";
import { useFilesStoreOps } from "./use-files-store-ops";

export function useUploadFile() {
    const { pwd } = useFilesStoreOps();
    const enqueueFileUpload = useEnqueueFileUpload();

    return function () {
        const elemInput = document.createElement('input');
        elemInput.type = "file";
        elemInput.multiple = true;
        elemInput.style.cssText = 'display:none;';
        elemInput.oninput = async (ev: Event) => {
            const files = (ev.target as HTMLInputElement).files;
            if (!files) {
                return;
            }
            enqueueFileUpload(Array.from(files), pwd()!);
            elemInput.parentElement?.removeChild(elemInput);
        }
        document.body.appendChild(elemInput);
        elemInput.click();
    }
}
