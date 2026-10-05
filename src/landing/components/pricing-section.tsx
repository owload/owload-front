import { Check } from "lucide-react";
import { useRegister } from "@/auth-context-provider";
import { Placeholder, SectionTag } from "./placeholder";

/** The text is a direct flex child, as in the design: a lone placeholder becomes a block and so is taller than plain text. */
function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check size={20} strokeWidth={2.4} className="mt-[3px] flex-none text-(--lp-ink)" aria-hidden="true" />
      {children}
    </li>
  );
}

/** The plans are placeholders: the design leaves the names, prices and features open. */
export function PricingSection() {
  const register = useRegister();
  return (
    <div id="pricing" className="lp-dark mt-24 bg-(--lp-ink) text-white">
      <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-12 px-[clamp(20px,4vw,40px)] py-24">
        <div className="flex max-w-[720px] flex-col gap-4">
          <SectionTag>Pricing</SectionTag>
          <h2 className="m-0 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-balance">
            Start free, upgrade when you need more space
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
          <div className="flex flex-col gap-6 rounded-[20px] bg-(--lp-yellow) p-7 text-(--lp-ink)">
            <div className="flex flex-col gap-2">
              <div className="text-[18px] font-extrabold">Free</div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[44px] font-extrabold leading-none tracking-[-0.02em]">0</span>
                <Placeholder className="text-[15px] text-(--lp-text-yellow)">[CURRENCY]</Placeholder>
              </div>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-(--lp-text-yellow)">
              <Item><span><Placeholder>[STORAGE]</Placeholder> <span className="text-(--lp-ink)">of storage</span></span></Item>
              <Item><Placeholder>[FEATURE]</Placeholder></Item>
              <Item><Placeholder>[FEATURE]</Placeholder></Item>
            </ul>
            <button type="button" onClick={() => register()} className="lp-btn mt-auto flex min-h-[52px] cursor-pointer items-center justify-center rounded-[14px] bg-(--lp-ink) px-6 font-bold text-(--lp-yellow) hover:bg-(--lp-ink-2)">
              Start free
            </button>
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-6 rounded-[20px] bg-white p-7 text-(--lp-ink)">
              <div className="flex flex-col gap-2 text-(--lp-placeholder)">
                <div className="text-[18px] font-extrabold"><Placeholder className="border-(--lp-placeholder-edge)">[PLAN NAME]</Placeholder></div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <Placeholder className="rounded-lg border-(--lp-placeholder-edge) text-[30px] font-extrabold leading-[1.3]" style={{ padding: "2px 8px" }}>[YOUR PRICE]</Placeholder>
                  <span className="text-[15px] text-(--lp-muted)">per month</span>
                </div>
              </div>
              <ul className="m-0 flex list-none flex-col gap-3 p-0 text-(--lp-placeholder)">
                <Item><span><Placeholder className="border-(--lp-placeholder-edge)">[STORAGE]</Placeholder> <span className="text-(--lp-ink)">of storage</span></span></Item>
                <Item><Placeholder className="border-(--lp-placeholder-edge)">[FEATURE]</Placeholder></Item>
                <Item><Placeholder className="border-(--lp-placeholder-edge)">[FEATURE]</Placeholder></Item>
              </ul>
              <a href="#contact" className="lp-btn mt-auto flex min-h-[52px] items-center justify-center rounded-[14px] bg-(--lp-yellow) px-6 font-bold hover:bg-(--lp-yellow-edge)">Choose version</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
