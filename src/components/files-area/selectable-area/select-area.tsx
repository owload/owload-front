import { ReactElement } from "react";
import { SelectAreaContext } from "./select-area-context";
import { SelectAreaLogic } from "./select-area-logic";

export interface SelectAreaProps {
    children: ReactElement;
    deselectAll: () => void;
    selectIds: (ids: string[]) => void;
    addSelected: (id: string) => void;
    addSelectedWithShift: (id: string) => void; // select all files between last selected and current
    removeSelected: (id: string) => void;
    removeSelectedWithShift: (id: string) => void; // deselect all files between last selected and current
    isSelected: (id: string) => boolean;
}

export function SelectArea({ children, deselectAll, selectIds, addSelected, addSelectedWithShift, removeSelected, removeSelectedWithShift, isSelected }: SelectAreaProps) {
    return (
        <SelectAreaContext
            deselectAll={deselectAll}
            addSelected={addSelected}
            addSelectedWithShift={addSelectedWithShift}
            removeSelected={removeSelected}
            removeSelectedWithShift={removeSelectedWithShift}
            isSelected={isSelected}
        >
            <SelectAreaLogic children={children} deselectAll={deselectAll} selectIds={selectIds} />
        </SelectAreaContext>
    );
}