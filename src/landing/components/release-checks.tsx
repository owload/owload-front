import { ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { SparklesIcon, TargetIcon, UserCheckIcon } from "./design-icons";

function Step({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <span className="flex items-center gap-[7px] whitespace-nowrap">
      {icon}
      <span>{children}</span>
    </span>
  );
}

function Chevron() {
  return (
    <span aria-hidden="true" className="flex text-(--lp-text-yellow)">
      <ChevronRight size={16} strokeWidth={2.6} />
    </span>
  );
}

/**
 * The "Before every release" strip. It is always one line: when the width of its parent is not enough, the strip is
 * left out (kept in the page, invisible and out of the layout, so that it is measured again when the width grows).
 */
export function ReleaseChecks() {
  const box = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const parent = box.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const style = getComputedStyle(parent);
      const available = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setFits((strip.current?.offsetWidth ?? 0) <= available);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    // The strip's own width depends on the font, which may arrive after the first render.
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={box}
      aria-hidden={!fits}
      className={fits ? "flex w-full justify-center" : "pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"}
    >
      <div
        ref={strip}
        className="flex min-h-11 flex-none items-center gap-x-2.5 whitespace-nowrap rounded-[22px] bg-white/60 py-2 pl-2 pr-4 text-[15px] font-bold"
      >
        <span className="flex h-7 items-center rounded-full bg-(--lp-ink) px-3 font-extrabold text-(--lp-yellow)">Before every release</span>
        <Step icon={<SparklesIcon size={18} strokeWidth={2.2} aria-hidden="true" />}>AI code review</Step>
        <Chevron />
        <Step icon={<TargetIcon size={18} strokeWidth={2.2} aria-hidden="true" />}>AI break-in attempts</Step>
        <Chevron />
        <Step icon={<UserCheckIcon size={18} strokeWidth={2.2} aria-hidden="true" />}>Human review</Step>
      </div>
    </div>
  );
}
