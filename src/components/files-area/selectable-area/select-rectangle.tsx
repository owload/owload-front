export interface SelectRectangleProps {
    initialPos: { x: number, y: number };
    finalPos: { x: number, y: number },
    show: boolean;
}

export default function SelectRectangle({ initialPos, finalPos, show }: SelectRectangleProps) {
    if (!show) return null;


    return (
        <div
            className="absolute z-15 border-1 border-[#989584] bg-[#bcb9a6] opacity-40"
            style={{
                left: Math.min(initialPos.x, finalPos.x),
                top: Math.min(initialPos.y, finalPos.y),

                width: Math.abs(finalPos.x - initialPos.x),
                height: Math.abs(finalPos.y - initialPos.y)
            }}></div>
    );
}