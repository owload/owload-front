/**
 * Small drawings of what a file looks like in the grid, used in the product mock-up. The documents are
 * illustrations; the photographs are real pictures.
 */

type Kind = "XLSX" | "DOCX" | "PDF" | "PPTX" | "JPG" | "HEIC";

const BADGE_COLOR: Record<Kind, string> = {
  XLSX: "bg-(--lp-green)",
  DOCX: "bg-(--lp-blue)",
  PDF: "bg-(--lp-red)",
  PPTX: "bg-(--lp-orange)",
  JPG: "bg-(--lp-violet)",
  HEIC: "bg-(--lp-violet)",
};

export function TypeBadge({ kind }: { kind: Kind }) {
  return (
    <span className={`absolute right-0 top-0 rounded-bl-[10px] px-2 pb-1 pt-[3px] text-[10px] font-extrabold tracking-[0.06em] text-white ${BADGE_COLOR[kind]}`}>
      {kind}
    </span>
  );
}

const SHEET_ROWS = [
  [40, 90, 60, 0],
  [40, 75, 0, 70],
  [40, 85, 55, 45],
  [40, 60, 70, 0],
  [40, 80, 40, 65],
];

/** A spreadsheet: a green header row and lines of cells. */
export function SheetThumb() {
  return (
    <div aria-hidden="true" className="absolute inset-0 grid grid-cols-[0.5fr_1.6fr_1fr_1fr] auto-rows-fr gap-px bg-[#e3dfcf]">
      {[60, 70, 50, 60].map((w, i) => (
        <div key={"h" + i} className="flex items-center bg-(--lp-green-bg) px-[5px]">
          <div className="h-[3px] rounded-[3px] bg-(--lp-green)" style={{ width: `${w}%` }} />
        </div>
      ))}
      {SHEET_ROWS.flatMap((row, r) =>
        row.map((w, c) => (
          <div key={`${r}-${c}`} className="flex items-center bg-white px-[5px]">
            {w > 0 && <div className="h-[3px] rounded-[3px] bg-(--lp-line-3)" style={{ width: `${w}%` }} />}
          </div>
        )),
      )}
    </div>
  );
}

/** A page of text: a dark title and grey lines. */
export function DocThumb({ title = 50 }: { title?: number }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-[7px] bg-white px-3.5 pt-3.5">
      <div className="h-1.5 rounded-[3px] bg-(--lp-ink)" style={{ width: `${title}%` }} />
      {[100, 100, 92, 100, 70, 100, 84].map((w, i) => (
        <div key={i} className="h-1 rounded-[3px] bg-(--lp-line-2)" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/** A slide: a title, bars and a few lines. */
export function SlidesThumb() {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex flex-col gap-2 bg-white px-3.5 pt-3.5">
      <div className="h-1.5 w-[58%] rounded-[3px] bg-(--lp-ink)" />
      <div className="flex min-h-0 flex-1 gap-2.5">
        <div className="flex flex-[1.2] items-end gap-[5px]">
          {[30, 52, 80, 44].map((h, i) => (
            <div key={i} className={`flex-1 rounded-t-[3px] ${i === 2 ? "bg-(--lp-ink)" : "bg-(--lp-yellow-edge)"}`} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 pt-1.5">
          {[100, 80, 90].map((w, i) => (
            <div key={i} className="h-1 rounded-[3px] bg-(--lp-line-2)" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The photographs of the landing page (public/landing) with the part of each that the design keeps in the crop. */
export const PHOTOS = {
  pelican: { src: "/landing/pelican.jpg", alt: "Pelican on a rock by the sea", position: "60% 58%" },
  pool: { src: "/landing/pool.jpg", alt: "Resort pool at night", position: "50% 62%" },
  monkeys: { src: "/landing/monkeys.jpg", alt: "Monkeys on temple ruins", position: "30% 68%" },
  glacier: { src: "/landing/glacier.jpg", alt: "Two people at a glacier viewpoint", position: "62% 38%" },
} as const;

export function PhotoThumb({ photo }: { photo: keyof typeof PHOTOS }) {
  const { src, alt, position } = PHOTOS[photo];
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 block size-full object-cover"
      style={{ objectPosition: position }}
    />
  );
}

/** One card of the grid: the picture of the file with its type badge, and its name with a lock. */
export function FileCard({ kind, name, children }: { kind: Kind; name: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-(--lp-line) bg-white">
        {children}
        <TypeBadge kind={kind} />
      </div>
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lp-muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span className="truncate">{name}</span>
      </div>
    </div>
  );
}
