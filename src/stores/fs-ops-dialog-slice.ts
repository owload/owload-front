import { FsDialogProps, FsOpsDialogType } from "@/types/types";
import { StateCreator } from "zustand";

export interface FsOpsDialogSlice {
    fsOpsDialogType?: FsOpsDialogType,
    setFsOpsDialogType: (fsOpsDialogType: FsOpsDialogType) => void,
    fsDialogProps: FsDialogProps,
    setFsDialogProps: (props: FsDialogProps) => void
}


export const createFsOpsDialogSlice: StateCreator<FsOpsDialogSlice, [], [], FsOpsDialogSlice> = (set) => ({
    fsOpsDialogType: undefined,
    setFsOpsDialogType: (fsOpsDialogType: FsOpsDialogType) => set({ fsOpsDialogType }),
    fsDialogProps: undefined,
    setFsDialogProps: (fsDialogProps: FsDialogProps) => set({ fsDialogProps })
});

