import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";


export function Toolbox(props: { className?: string }) {

    return (
        <div className={cn('pr-10 flex gap-1 items-center text-gray-600', props.className)}>
            <button
                type="button"
                className='2xs:hidden lg:inline-block bg-primary p-1 rounded-md hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
                <LayoutGrid size={20} />
            </button>
            <button
                type="button"
                className='2xs:hidden lg:inline-block bg-white p-2 rounded-md hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
                <List size={20} />
            </button>
        </div>
    );
};
