export interface SelectRectangleProps {
    initialPos: { x: number, y: number };
    finalPos: { x: number, y: number },
    show: boolean;
}

export default function SelectRectangle({ initialPos, finalPos, show }: SelectRectangleProps) {
    if (!show) return null;


    return (
        <div
            className="absolute z-15 border-1 border-[#989894] bg-[#bcbcb8] opacity-40"
            style={{
                left: Math.min(initialPos.x, finalPos.x),
                top: Math.min(initialPos.y, finalPos.y),

                width: Math.abs(finalPos.x - initialPos.x),
                height: Math.abs(finalPos.y - initialPos.y)
            }}></div>
    );
}