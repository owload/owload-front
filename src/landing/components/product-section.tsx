import { Archive, Lock, Plus, ShieldCheck } from "lucide-react";
import { DocThumb, PhotoThumb, SheetThumb, SlidesThumb, TypeBadge } from "./file-thumbs";
import { SectionTag } from "./placeholder";

/** A stack of three rotated file cards, as in the "Office files" panel. */
function OfficeStack() {
  const card = "relative w-[46%] flex-none aspect-4/3 overflow-hidden rounded-xl bg-white shadow-[0_12px_28px_rgba(26,26,25,0.22)]";
  return (
    <div className="mt-auto flex items-end justify-center pb-2 pt-7" aria-hidden="true">
      <div className={`${card} z-[1] -rotate-[7deg]`}><SheetThumb /><TypeBadge kind="XLSX" /></div>
      <div className={`${card} z-[3] -ml-[19%]`}><DocThumb /><TypeBadge kind="PDF" /></div>
      <div className={`${card} z-[2] -ml-[19%] rotate-[7deg]`}><SlidesThumb /><TypeBadge kind="PPTX" /></div>
    </div>
  );
}

function MediaTiles() {
  return (
    <div
      className="mt-auto grid auto-rows-[clamp(84px,9.5vw,120px)] grid-cols-6 gap-2.5 pt-5"
      aria-hidden="true"
    >
      <div className="relative col-span-3 row-span-2 overflow-hidden rounded-[14px] bg-(--lp-ink-2)"><PhotoThumb photo="pelican" /></div>
      <div className="relative col-span-3 overflow-hidden rounded-[14px] bg-(--lp-ink-2)"><PhotoThumb photo="pool" /></div>
      <div className="relative col-span-2 overflow-hidden rounded-[14px] bg-(--lp-ink-2)"><PhotoThumb photo="monkeys" /></div>
      <div className="col-span-1 flex items-center justify-center rounded-[14px] bg-(--lp-yellow) text-(--lp-ink)"><Plus size={22} strokeWidth={2.4} /></div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[20px] border-2 border-(--lp-ink) p-7">
      <div className="flex size-[52px] items-center justify-center rounded-[14px] bg-(--lp-yellow)">{icon}</div>
      <h3 className="mb-0 mt-1 text-[22px] font-extrabold leading-tight">{title}</h3>
      {children}
    </div>
  );
}

export function ProductSection() {
  const heading = "m-0 text-[clamp(24px,2.4vw,30px)] font-extrabold leading-[1.15] tracking-[-0.015em]";
  return (
    <section id="product" className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-[clamp(20px,4vw,40px)] pt-24">
      <div className="flex max-w-[760px] flex-col gap-4">
        <SectionTag>Product</SectionTag>
        <h2 className="m-0 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-balance">
          Work files and personal media, encrypted the same way
        </h2>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-5">
        <div className="flex flex-col gap-3.5 overflow-hidden rounded-3xl bg-(--lp-yellow) p-[clamp(24px,3vw,36px)]">
          <h3 className={heading}>Office files</h3>
          <p className="m-0 max-w-[400px] text-(--lp-text-yellow)">
            Documents, spreadsheets and presentations show a preview right in the grid, so you find the file without opening it.
          </p>
          <OfficeStack />
        </div>
        <div className="lp-dark flex flex-col gap-3.5 rounded-3xl bg-(--lp-ink) p-[clamp(24px,3vw,36px)] text-white">
          <h3 className={heading}>Photos and videos</h3>
          <p className="m-0 max-w-[400px] text-(--lp-on-dark)">Media has its own section with previews you can scan at a glance.</p>
          <MediaTiles />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
        <Feature icon={<Lock size={26} strokeWidth={2} />} title="Encrypt, then upload">
          <p className="m-0 text-(--lp-text-white)">Each file is encrypted on your device first and uploaded second. You can watch both steps.</p>
          <div className="lp-dark mt-auto grid grid-cols-2 gap-3.5 rounded-xl bg-(--lp-ink) p-3.5 text-[13px] font-bold text-white">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between"><span>Encrypt</span><span className="text-(--lp-yellow)">100%</span></div>
              <div role="img" aria-label="Encryption complete" className="h-1.5 rounded-full bg-(--lp-yellow)" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between"><span>Upload</span><span className="text-(--lp-yellow)">62%</span></div>
              <div role="img" aria-label="Upload 62 percent" className="h-1.5 overflow-hidden rounded-full bg-(--lp-ink-3)">
                <div className="h-full w-[62%] rounded-full bg-(--lp-yellow)" />
              </div>
            </div>
          </div>
        </Feature>
        <Feature icon={<Archive size={26} strokeWidth={2} />} title="Drives you can close">
          <p className="m-0 text-(--lp-text-white)">Keep files in separate drives and close all of them with one click.</p>
        </Feature>
        <Feature icon={<ShieldCheck size={26} strokeWidth={2} />} title="Verify it yourself">
          <p className="m-0 text-(--lp-text-white)">The source code is public. Inspect how encryption works before you trust it with your files.</p>
        </Feature>
      </div>
    </section>
  );
}
