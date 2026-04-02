import { cn } from "@/lib/utils";
import React from "react";

export interface ToolboxButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    tooltip: string;
    className?: string;
}

export function ToolboxButton({ disabled, icon, tooltip, onClick, className, ...rest }: ToolboxButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn('bg-white p-1 rounded-md enabled:hover:bg-gray-100 disabled:opacity-50 enabled:cursor-pointer disabled:cursor-arrow', className)}
            title={tooltip}
            onPointerDown={(e) => e.stopPropagation()}
            {...rest}
        >
            {icon}
        </button>
    );
}
