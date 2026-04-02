import { cn } from "@/lib/utils";

export function ExtensionBadge({ extension, className, size }: { extension: string, className?: string, size?: 'small' | 'normal' }) {
    if (extension === '') {
        return null;
    }
    return <div
        className={cn(
            "rounded-tr-lg rounded-bl-lg text-center font-semibold text-white font-montserrat uppercase",
            {
                "text-xs py-1 w-12": size !== "small",
                "text-[7px] px-[3px]": size === "small",
            },
            getColorClassname(extension),
            className
        )}
    >{extension}</div>;
}

function getColorClassname(extension: string) {
    switch (extension) {
        case 'txt':
            return 'bg-[#0078D7]';
        case 'docx':
        case 'doc':
            return 'bg-[#2B579A]';
        case 'pdf':
            return 'bg-[#EB5757]';
        case 'xlsx':
        case 'xls':
            return 'bg-[#217346]';
        case 'mp4':
        case 'avi':
        case 'mkv':
            return 'bg-[#F2994A]';
        case 'jpg':
        case 'jpeg':
        case 'png':
            return 'bg-[#9B51E0]';
        case 'zip':
        case 'rar':
            return 'bg-[#A333C8]';
        default:
            return 'bg-[#6B7280]';
    }
}
