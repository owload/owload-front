import { Archive, ChevronRight, ChevronsUpDown, Clock, FileText, FolderPlus, Image as ImageIcon, Lock, Search, SlidersHorizontal, Trash2, UploadCloud } from "lucide-react";
import { DocThumb, FileCard, PhotoThumb, SheetThumb, SlidesThumb } from "./file-thumbs";
import { Logo } from "./logo";

const SECTIONS = [
  { label: "All Files", Icon: FileText, active: true },
  { label: "Recent", Icon: Clock },
  { label: "Media", Icon: ImageIcon },
  { label: "Recycle Bin", Icon: Trash2 },
  { label: "Settings", Icon: SlidersHorizontal },
];

/**
 * The picture of the product in the hero: the dark side panel and a grid of file cards. It is an illustration with
 * made-up files, drawn with markup, not a screenshot.
 */
export function AppMockup() {
  return (
    <div
      role="img"
      aria-label="Owload file manager showing encrypted documents, spreadsheets, presentations and photos"
      className="flex overflow-hidden rounded-[20px] bg-white text-left shadow-[0_30px_70px_rgba(26,26,25,0.28)]"
    >
      <div className="lp-dark flex flex-none basis-[212px] flex-col gap-4 bg-(--lp-ink) px-3.5 py-[18px] text-[14px] font-semibold text-white max-[720px]:hidden">
        <Logo height={26} className="my-0.5 ml-1 self-start brightness-0 invert" />
        <div className="flex items-center gap-2.5 rounded-xl bg-(--lp-ink-2) py-[7px] pl-[7px] pr-2.5">
          <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] bg-(--lp-yellow) text-(--lp-ink)">
            <Archive size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 font-extrabold">Work</span>
          <ChevronsUpDown size={16} className="text-[#b9b5a3]" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-(--lp-yellow) font-extrabold text-(--lp-ink)">
            <UploadCloud size={16} /> Upload
          </div>
          <div className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-(--lp-ink-3)">
            <FolderPlus size={16} /> Create
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {SECTIONS.map(({ label, Icon, active }) => (
            <div
              key={label}
              className={`flex h-[38px] items-center gap-2.5 rounded-[10px] px-2.5 ${active ? "bg-(--lp-yellow) font-extrabold text-(--lp-ink)" : "text-(--lp-on-dark)"}`}
            >
              <Icon size={16} /> {label}
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2 rounded-xl bg-(--lp-ink-2) p-3 text-[12px]">
          <div className="flex justify-between gap-2">
            <span className="font-extrabold">Storage</span>
            <span className="text-(--lp-on-dark)">1.5 of 3 GB</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-(--lp-ink-3)">
            <div className="h-full w-1/2 rounded-full bg-(--lp-yellow)" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 px-[clamp(14px,2vw,22px)] pb-[22px] pt-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <div className="flex h-10 max-w-80 flex-[1_1_180px] items-center gap-2.5 rounded-[10px] bg-(--lp-field) px-3.5 text-[14px] text-(--lp-muted)">
            <Search size={16} /> Search
          </div>
          <div className="flex h-10 items-center gap-2 rounded-[10px] border-[1.5px] border-(--lp-ink) pl-3 pr-1.5 text-[14px] font-extrabold">
            <Lock size={16} strokeWidth={2.2} /> Close all drives
            <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-lg bg-(--lp-ink) text-[13px] text-(--lp-yellow)">1</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[20px] font-extrabold">
            <span className="text-(--lp-muted)">Work</span>
            <ChevronRight size={16} className="text-(--lp-muted)" strokeWidth={2.4} />
            <span>2026</span>
          </div>
          <div className="text-[13px] font-bold text-(--lp-muted)">8 files · all encrypted</div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(clamp(120px,13.5vw,170px),100%),1fr))] gap-x-3.5 gap-y-4">
          <FileCard kind="XLSX" name="Budget Q3.xlsx"><SheetThumb /></FileCard>
          <FileCard kind="JPG" name="IMG_5187.jpg"><PhotoThumb photo="pelican" /></FileCard>
          <FileCard kind="PDF" name="Contract.pdf"><DocThumb title={50} /></FileCard>
          <FileCard kind="HEIC" name="IMG_5188.HEIC"><PhotoThumb photo="pool" /></FileCard>
          <FileCard kind="PPTX" name="Pitch deck.pptx"><SlidesThumb /></FileCard>
          <FileCard kind="JPG" name="IMG_7225.jpeg"><PhotoThumb photo="monkeys" /></FileCard>
          <FileCard kind="DOCX" name="Annual report.docx"><DocThumb title={36} /></FileCard>
          <FileCard kind="JPG" name="IMG_5190.jpg"><PhotoThumb photo="glacier" /></FileCard>
        </div>
      </div>
    </div>
  );
}
