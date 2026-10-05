import { Check } from "lucide-react";
import { SparklesIcon, TargetIcon, UserCheckIcon } from "./design-icons";
import { Placeholder, SectionTag } from "./placeholder";

const STEPS = [
  {
    icon: SparklesIcon,
    title: "AI deep code review",
    text: "Before any release, AI goes through the code in depth, looking for security problems.",
  },
  {
    icon: TargetIcon,
    title: "AI break-in attempts",
    text: "We attack our own product with AI, the way a real attacker would, and fix what it finds.",
  },
  {
    icon: UserCheckIcon,
    title: "Human review",
    text: "Engineers review the same change. Nothing ships on the AI’s word alone.",
  },
];

/** How a release is checked before it ships: the target of the "Before every release" strip in the hero. */
export function SecuritySection() {
  return (
    <section
      id="security"
      className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-x-16 gap-y-10 px-[clamp(20px,4vw,40px)] pt-24"
    >
      <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-5">
        <SectionTag>Security</SectionTag>
        <h2 className="m-0 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.12] tracking-[-0.02em] text-balance">
          AI reviews every release, then tries to break it
        </h2>
        <p className="m-0 max-w-[460px] text-(--lp-text-white)">
          Encryption on your device is only as trustworthy as the code that does it, so no release skips these checks.
        </p>
        <p className="m-0 text-(--lp-placeholder)">
          <Placeholder className="border-(--lp-placeholder-edge)">[WHAT THE AI REVIEW LOOKS FOR: 2–3 EXAMPLES]</Placeholder>
        </p>
      </div>
      <div className="min-w-0 flex-[1_1_440px]">
        <div className="lp-dark flex flex-col gap-5 rounded-3xl bg-(--lp-ink) p-[clamp(22px,3vw,32px)] text-white">
          <div className="text-[14px] font-extrabold tracking-[0.02em] text-(--lp-yellow)">Before every release</div>
          <div className="flex flex-col">
            <ol className="m-0 flex list-none flex-col p-0">
              {STEPS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="relative flex items-start gap-4 pb-6">
                  <span aria-hidden="true" className="absolute bottom-0 left-[21px] top-11 w-0.5 bg-(--lp-ink-3)" />
                  <span className="relative flex size-11 flex-none items-center justify-center rounded-xl bg-(--lp-yellow) text-(--lp-ink)">
                    <Icon size={22} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="m-0 text-[20px] font-extrabold leading-[1.25]">{title}</h3>
                    <p className="m-0 text-(--lp-on-dark)">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex min-h-11 items-center gap-4 text-[18px] font-extrabold">
              <span className="flex size-11 flex-none items-center justify-center rounded-full border-2 border-(--lp-yellow) text-(--lp-yellow)">
                <Check size={22} strokeWidth={2.8} aria-hidden="true" />
              </span>
              <span>Only then it ships</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
