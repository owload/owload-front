import React, { ReactElement } from 'react'
import { useSelectableAreaFunctions, useSelectableItemRefs } from './select-area-context';
import { useIsMobileSelectModeOn } from '@/hooks/use-mobile-select-mode';
import { useIsMobile } from '@/hooks/use-mobile';

export interface SelectableItemProps {
    id: any;
    children: ReactElement;
}

export function SelectableItem({ id, children }: SelectableItemProps) {
    const selectableItemRefs = useSelectableItemRefs();
    const { isSelected, deselectAll, addSelected, removeSelected, addSelectedWithShift, removeSelectedWithShift } = useSelectableAreaFunctions()!;
    const mobileFileSelectModeOn = useIsMobileSelectModeOn();
    const isMobile = useIsMobile();

    const refCallback = (node: HTMLElement | null) => {
        selectableItemRefs.current.set(id, node as HTMLElement);
        return () => {
            selectableItemRefs.current.delete(id);
        };
    }

    function handleNormalPointerDown(e?: React.PointerEvent<HTMLElement>) {
        if (!e?.shiftKey) {
            if (!isSelected(id)) {
                deselectAll();
                addSelected(id);
            }
        } else {
            if (isSelected(id)) {
                removeSelectedWithShift(id);
            } else {
                addSelectedWithShift(id);
            }
        }
    }

    function handleMobileSelectModePointerDown() {
        if (isSelected(id)) {
            removeSelected(id);
        } else {
            addSelected(id);
        }
    }

    function handlePointerDown(e?: React.PointerEvent<HTMLElement>) {
        e?.stopPropagation();
        if (mobileFileSelectModeOn) {
            // mobile phone used and user started to select files
            handleMobileSelectModePointerDown();
        } else {
            // normal mode: PC or mobile with select mode off
            handleNormalPointerDown(e);
        }
    }

    const handleContextMenu = () => {
        if (!isMobile) {
            return;
        }
        handlePointerDown?.();
    }


    function modifyChild(child: ReactElement<any>) {
        const props = {
            onPointerDown: handlePointerDown,
            onContextMenu: handleContextMenu,
            ref: refCallback
        };
        return React.cloneElement(child, props);
    }

    return (
        <>
            {modifyChild(children)}
        </>
    )
}
