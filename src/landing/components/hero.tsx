import { ArrowRight } from "lucide-react";
import { CodeIcon } from "./design-icons";
import { useRegister } from "@/auth-context-provider";
import { AppMockup } from "./app-mockup";
import { SOURCE_CODE_URL } from "./data";
import { LandingHeader } from "./landing-header";
import { Highlight, Rings } from "./placeholder";
import { ServersCard } from "./servers-card";

export function Hero() {
  const register = useRegister();
  return (
    <div className="relative" id="top">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-[200px] top-0 overflow-hidden bg-(--lp-yellow)">
        <Rings
          sizes={[300, 500, 700, 900]}
          offset={(size) => ({ top: 50 - ((size - 300) / 2), right: 50 - ((size - 300) / 2) })}
        />
      </div>
      <LandingHeader />
      <section className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center gap-[22px] px-[clamp(20px,4vw,40px)] pt-4 text-center">
        <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer" className="lp-btn flex min-h-11 items-center gap-2.5 rounded-full bg-(--lp-ink) pl-3 pr-4 text-[15px] font-bold text-white hover:bg-(--lp-ink-2)">
          <span className="flex size-7 items-center justify-center rounded-full bg-(--lp-yellow) text-(--lp-ink)">
            <CodeIcon size={16} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="max-[720px]:hidden">Public source code</span>
          <span aria-hidden="true" className="h-[18px] w-px bg-(--lp-ink-3) max-[720px]:hidden" />
          <span className="whitespace-nowrap text-(--lp-yellow)">Inspect the code</span>
          <ArrowRight size={16} strokeWidth={2.4} className="text-(--lp-yellow)" aria-hidden="true" />
        </a>
        <h1 className="m-0 max-w-[900px] text-[clamp(38px,4.8vw,60px)] font-extrabold leading-[1.06] tracking-[-0.02em] text-balance">
          Cloud file storage with encryption <Highlight>you can verify</Highlight>
        </h1>
        <div className="flex flex-wrap justify-center gap-3 text-[17px] font-bold">
          <button type="button" onClick={() => register()} className="lp-btn flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[14px] bg-(--lp-ink) px-7 text-(--lp-yellow) hover:bg-(--lp-ink-2)">
            <span>Start free</span>
            <ArrowRight size={20} strokeWidth={2.4} />
          </button>
          <a href="#pricing" className="lp-btn flex min-h-14 items-center rounded-[14px] bg-white px-7 hover:bg-(--lp-field)">Choose version</a>
        </div>
        <div className="relative mt-[30px] w-full max-[720px]:mt-0">
          <ServersCard />
          <AppMockup />
          <ServersCard floating />
        </div>
      </section>
    </div>
  );
}
