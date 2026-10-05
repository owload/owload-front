import { ArrowRight } from "lucide-react";
import { useRegister } from "@/auth-context-provider";
import { Highlight, Placeholder, Rings, SectionTag } from "./placeholder";

/** The closing yellow block: the call to start, the way to ask a question, and the client download. */
export function ContactSection() {
  const register = useRegister();
  return (
    <div id="contact" className="relative overflow-hidden bg-(--lp-yellow)">
      <Rings sizes={[320, 520, 720]} offset={(size) => ({ bottom: -(size / 2) - 0, left: -(size / 3) })} />
      <section className="relative mx-auto flex w-full max-w-[1120px] flex-wrap items-stretch gap-x-12 gap-y-8 px-[clamp(20px,4vw,40px)] py-[88px]">
        <div className="flex min-w-0 flex-[1_1_400px] flex-col justify-center gap-5">
          <h2 className="m-0 text-[clamp(32px,4vw,52px)] font-extrabold leading-[1.08] tracking-[-0.02em] text-balance">
            Keep your files private. <Highlight>Start free</Highlight>
          </h2>
          <div className="flex flex-wrap gap-3 text-[17px] font-bold">
            <button type="button" onClick={() => register()} className="lp-btn flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[14px] bg-(--lp-ink) px-7 text-(--lp-yellow) hover:bg-(--lp-ink-2)">
              <span>Start free</span>
              <ArrowRight size={20} strokeWidth={2.4} />
            </button>
            <a href="#pricing" className="lp-btn flex min-h-14 items-center rounded-[14px] bg-white px-7 hover:bg-(--lp-field)">Choose version</a>
          </div>
          <p className="m-0 text-[18px] text-(--lp-text-yellow)">
            Questions? Write to <Placeholder>[CONTACT EMAIL]</Placeholder>
          </p>
        </div>
        <div id="client" className="lp-dark flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-3xl bg-(--lp-ink) p-[clamp(24px,3vw,36px)] text-white">
          <SectionTag>Client</SectionTag>
          <h3 className="m-0 text-[clamp(24px,2.4vw,30px)] font-extrabold leading-[1.15] tracking-[-0.015em]">Get the Owload client</h3>
          <p className="m-0 text-(--lp-yellow)">
            <Placeholder>[WHAT THE CLIENT DOES AND WHICH PLATFORMS IT SUPPORTS]</Placeholder>
          </p>
          <div className="mt-auto flex flex-wrap gap-2.5 pt-3 font-bold text-(--lp-yellow)">
            {[0, 1, 2].map((i) => (
              <a key={i} href="#contact" className="lp-btn flex min-h-12 items-center justify-center rounded-xl border border-dashed border-(--lp-yellow) px-[18px] hover:bg-white/10">[PLATFORM]</a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
