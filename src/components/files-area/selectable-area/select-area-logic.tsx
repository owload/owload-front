import { Children, PointerEventHandler, ReactElement, useCallback, useEffect, useRef, useState } from "react";
import SelectRectangle from "./select-rectangle";
import { useSelectableItemRefs } from "./select-area-context";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface SelectAreaLogicProps {
    children: ReactElement;
    deselectAll: () => void;
    selectIds: (ids: string[]) => void;
}

export function SelectAreaLogic({ children, deselectAll, selectIds }: SelectAreaLogicProps) {
    const isMobile = useIsMobile();
    const selectableItemRefs = useSelectableItemRefs();

    const filesAreaDivRef: React.RefObject<HTMLDivElement | null> = useRef(null);
    const [showSelectArea, setShowSelectArea] = useState(false);
    const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
    const [finalPos, setFinalPos] = useState({ x: 0, y: 0 });
    const initialPosRef = useRef({ x: 0, y: 0 });

    const stopSelection = useCallback(() => {
        setShowSelectArea(false);
    }, []);

    const updateSelection = useCallback((clientX: number, clientY: number) => {
        const bounds = filesAreaDivRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const x = clientX - bounds.left;
        const y = clientY - bounds.top;
        setFinalPos({ x, y });

        const selectAreaRect = new DOMRect(
            Math.min(initialPosRef.current.x, x),
            Math.min(initialPosRef.current.y, y),
            Math.abs(x - initialPosRef.current.x),
            Math.abs(y - initialPosRef.current.y)
        );

        const intersectedIds: string[] = [];
        for (let [id, element] of selectableItemRefs.current.entries()) {
            const rect = element.getBoundingClientRect();
            rect.x -= bounds.left;
            rect.y -= bounds.top;
            if (rectsIntersect(selectAreaRect, rect)) {
                intersectedIds.push(id);
            }
        }
        selectIds(intersectedIds);
    }, [selectIds, selectableItemRefs]);

    // Global listeners active only during selection — no setPointerCapture needed
    useEffect(() => {
        if (!showSelectArea) return;
        const onMove = (e: PointerEvent) => updateSelection(e.clientX, e.clientY);
        const onUp = () => stopSelection();
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        return () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        };
    }, [showSelectArea, updateSelection, stopSelection]);

    const handlePointerDown: PointerEventHandler<HTMLElement> = (e) => {
        if (e.button !== 0 || isMobile) {
            return;
        }
        deselectAll();
        const bounds = filesAreaDivRef.current!.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        initialPosRef.current = { x, y };
        setInitialPos({ x, y });
        setFinalPos({ x, y });
        setShowSelectArea(true);
    }

    const handlePointerMove: PointerEventHandler<HTMLElement> = (e) => {
        if (!showSelectArea) return;
        updateSelection(e.clientX, e.clientY);
    }

    const handlePointerUp: PointerEventHandler<HTMLElement> = () => {
        stopSelection();
    }

    function modifyChild(child: ReactElement<any>) {
        const props = {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            ref: filesAreaDivRef
        };

        const subChildren = Children.toArray(child.props.children);
        subChildren.push(<SelectRectangle show={showSelectArea} initialPos={initialPos} finalPos={finalPos} key={"_0_"} />);
        const newChild = React.cloneElement(child, props, subChildren);
        return newChild;
    }

    return (
        <>
            {modifyChild(children)}
        </>
    );
}

function rectsIntersect(rect1: DOMRect, rect2: DOMRect): boolean {
    return rect1.right >= rect2.left && rect1.left <= rect2.right && rect1.top <= rect2.bottom && rect1.bottom >= rect2.top
}