import { useFilesStore } from "@/stores/files-store";

export function useIsSelectedFileObject() {
    const fileObjects = useFilesStore((state) => state.fileObjects);
    return (id: string) => fileObjects.find(e => e.id === id)?.selected === true;
  }