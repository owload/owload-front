import { useFilesStore } from "@/stores/files-store";

export function useSelectedFileObjects() {
    const fileObjects = useFilesStore((state) => state.fileObjects);
    return fileObjects.filter(e => e.selected);
  }
  