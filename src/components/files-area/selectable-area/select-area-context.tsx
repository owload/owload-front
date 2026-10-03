import { createContext, PropsWithChildren, useContext, useRef } from 'react';

type NodesMap = Map<string, HTMLElement>;
type NodesMapRef = React.RefObject<NodesMap>;

type SelectableAreaFunctions = {
    addSelected: (id: string) => void;
    addSelectedWithShift: (id: string) => void; // select all files between last selected and current
    removeSelected: (id: string) => void;
    removeSelectedWithShift: (id: string) => void; // deselect all files between last selected and current
    deselectAll: () => void;
    isSelected: (id: string) => boolean;
};

const SelectableItemRefsContext = createContext<NodesMapRef>({ current: new Map<string, HTMLElement>() });
const SelectableAreaFunctionsContext = createContext<SelectableAreaFunctions | null>(null);

export function SelectAreaContext({ addSelected, addSelectedWithShift, removeSelected, removeSelectedWithShift, deselectAll, isSelected, children }: SelectableAreaFunctions & PropsWithChildren<{}>) {
    const selectableItemRefs = useRef(new Map<string, HTMLElement>());

    return (
        <SelectableAreaFunctionsContext.Provider value={{ addSelected, addSelectedWithShift, removeSelected, removeSelectedWithShift, deselectAll, isSelected }}>
            <SelectableItemRefsContext.Provider value={selectableItemRefs}>
                {children}
            </SelectableItemRefsContext.Provider>
        </SelectableAreaFunctionsContext.Provider>
    )
}

export function useSelectableItemRefs(): NodesMapRef {
    return useContext(SelectableItemRefsContext);
}

export function useSelectableAreaFunctions() {
    return useContext(SelectableAreaFunctionsContext);
}
