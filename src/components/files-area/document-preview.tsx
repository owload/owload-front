import type { ReactNode } from "react";

/**
 * Drawn stand-ins for the preview of a document, shown until the file has a real thumbnail: a page of text lines, a
 * grid of cells or a slide. They only hint at the kind of file; nothing in them comes from the file.
 */
const LINES = [100, 100, 92, 100, 70, 100, 84];
const CELLS = [40, 90, 60, 0, 40, 75, 0, 70, 40, 85, 55, 45, 40, 60, 70, 0, 40, 80, 40, 65];

function Page({ children }: { children: ReactNode }) {
    return <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-[7px] bg-white px-3.5 pt-3.5">{children}</div>;
}

function TextPage() {
    return (
        <Page>
            <div className="h-1.5 w-1/2 rounded-[3px] bg-sunny-ink" />
            {LINES.map((w, i) => <div key={i} className="h-1 rounded-[3px] bg-[#d9d8d2]" style={{ width: `${w}%` }} />)}
        </Page>
    );
}

function SheetPage() {
    const header = [60, 70, 50, 60];
    return (
        <div aria-hidden="true" className="absolute inset-0 grid auto-rows-fr grid-cols-[0.5fr_1.6fr_1fr_1fr] gap-px bg-[#e2e1db]">
            {header.map((w, i) => (
                <div key={`h${i}`} className="flex items-center bg-[#ddefe3] px-[5px]"><div className="h-[3px] rounded-[3px] bg-sunny-green" style={{ width: `${w}%` }} /></div>
            ))}
            {CELLS.map((w, i) => (
                <div key={i} className="flex items-center bg-white px-[5px]">{w > 0 && <div className="h-[3px] rounded-[3px] bg-[#cdccc5]" style={{ width: `${w}%` }} />}</div>
            ))}
        </div>
    );
}

function SlidePage() {
    return (
        <Page>
            <div className="h-1.5 w-[58%] rounded-[3px] bg-sunny-ink" />
            <div className="flex min-h-0 flex-1 gap-2.5">
                <div className="flex flex-[1.2] items-end gap-[5px]">
                    {[30, 52, 80, 44].map((h, i) => <div key={i} className={`flex-1 rounded-t-[3px] ${i === 2 ? "bg-sunny-ink" : "bg-[#e3c13f]"}`} style={{ height: `${h}%` }} />)}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 pt-1.5">
                    {[100, 80, 90].map((w, i) => <div key={i} className="h-1 rounded-[3px] bg-[#d9d8d2]" style={{ width: `${w}%` }} />)}
                </div>
            </div>
        </Page>
    );
}

export function DocumentPreview({ extension }: { extension: string }) {
    switch (extension) {
        case "xlsx":
        case "xls":
            return <SheetPage />;
        case "pptx":
        case "ppt":
            return <SlidePage />;
        case "txt":
        case "doc":
        case "docx":
        case "pdf":
            return <TextPage />;
        default:
            return null;
    }
}

export const hasDocumentPreview = (extension: string) => ["xlsx", "xls", "pptx", "ppt", "txt", "doc", "docx", "pdf"].includes(extension);
