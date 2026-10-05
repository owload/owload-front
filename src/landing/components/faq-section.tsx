import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { FAQ_ITEMS } from "./data";
import { Placeholder, SectionTag } from "./placeholder";

/** An accordion: one answer is open at a time. The answers are placeholders until the real ones are supplied. */
export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto flex w-full max-w-[1120px] flex-wrap items-start gap-x-16 gap-y-8 px-[clamp(20px,4vw,40px)] py-24">
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
        <SectionTag>FAQ</SectionTag>
        <h2 className="m-0 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-balance">Questions and answers</h2>
      </div>
      <div className="flex min-w-0 flex-[2_1_520px] flex-col border-t border-(--lp-line)">
        {FAQ_ITEMS.map((question, i) => {
          const expanded = open === i;
          return (
            <div key={question} className="flex flex-col border-b border-(--lp-line)">
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-question-${i}`}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent py-3 text-left text-[19px] font-extrabold"
                >
                  <span>{question}</span>
                  <span className={`flex size-9 flex-none items-center justify-center rounded-[10px] ${expanded ? "bg-(--lp-ink) text-(--lp-yellow)" : "bg-(--lp-yellow) text-(--lp-ink)"}`}>
                    {expanded ? <Minus size={18} strokeWidth={2.4} /> : <Plus size={18} strokeWidth={2.4} />}
                  </span>
                </button>
              </h3>
              {expanded && (
                <p id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`} className="m-0 pb-5 pr-[52px] text-(--lp-placeholder)">
                  <Placeholder className="border-(--lp-placeholder-edge)">[YOUR ANSWER]</Placeholder>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
