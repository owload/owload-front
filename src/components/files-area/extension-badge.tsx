import { cn } from "@/lib/utils";

export function ExtensionBadge({ extension, className, size }: { extension: string, className?: string, size?: 'small' | 'normal' }) {
    if (extension === '') {
        return null;
    }
    return <div
        className={cn(
            "text-center font-semibold uppercase text-white",
            {
                "rounded-bl-[10px] px-2 pb-1 pt-[3px] text-[10px] font-bold leading-[1.4] tracking-[0.06em]": size !== "small",
                "rounded-tr-lg rounded-bl-lg": size === "small",
                "text-[7px] px-[3px]": size === "small",
            },
            getColorClassname(extension),
            className
        )}
    >{extension}</div>;
}

export function getColorClassname(extension: string) {
    switch (extension) {
        case 'txt':
            return 'bg-[#0f766e]';
        case 'docx':
        case 'doc':
            return 'bg-sunny-blue';
        case 'pdf':
            return 'bg-sunny-red';
        case 'xlsx':
        case 'xls':
            return 'bg-sunny-green';
        case 'pptx':
        case 'ppt':
        case 'mp4':
        case 'avi':
        case 'mkv':
            return 'bg-sunny-orange';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'heic':
        case 'gif':
        case 'webp':
            return 'bg-sunny-violet';
        case 'zip':
        case 'rar':
            return 'bg-sunny-ink-track';
        default:
            return 'bg-sunny-muted';
    }
}
