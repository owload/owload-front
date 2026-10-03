import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DrivesToolboxBottom(props: { className?: string }) {
    const navigate = useNavigate();
    return (
        <div className={cn('flex gap-2 justify-center', props.className)}>
            <button
                type="button"
                onClick={() => navigate("/create")}
                title="Create new drive"
                className="w-18 h-18 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 flex items-center justify-center cursor-pointer"
            >
                <Plus size={25} />
            </button>
        </div>
    );
};
