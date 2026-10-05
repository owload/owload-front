import { ArrowRight, ChevronRight, Lock, LockOpen, Plus } from "lucide-react";
import { Link } from "react-router-dom";

function Step({ icon, children }: { icon: React.ReactNode, children: string }) {
    return <span className="flex items-center gap-3 px-1 md:gap-2 md:px-0">{icon}{children}</span>;
}

/** What the drives page shows instead of the list when there are no drives. */
export function NoDrives() {
    const step = "size-[18px]";
    return (
        <>
            <section className="flex flex-col gap-4 rounded-[20px] bg-sunny-ink p-5 text-white shadow-[0_24px_40px_-24px_rgba(26,26,25,0.55)] md:flex-row md:flex-wrap md:items-center md:gap-x-8 md:gap-y-6 md:p-7 md:shadow-[0_28px_48px_-28px_rgba(26,26,25,0.55)]">
                <div className="flex size-[52px] flex-none items-center justify-center rounded-[14px] bg-sunny-yellow text-sunny-ink md:size-16 md:rounded-2xl">
                    <Lock aria-hidden="true" className="size-6 md:size-7" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 md:flex-[1_1_360px]">
                    <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-sunny-yellow">Get started</div>
                    <h2 className="m-0 mt-1 text-2xl font-bold leading-[1.2] tracking-[-0.02em] md:text-[26px]">You have no drives yet</h2>
                    <p className="m-0 mt-2 max-w-[560px] text-sunny-on-dark">A drive is an encrypted space for your files. Open it to work with them, close it to hide everything again.</p>
                </div>
                <Link to="/create" className="flex h-[52px] items-center justify-center gap-2.5 rounded-xl bg-sunny-yellow px-[26px] text-base font-bold text-sunny-ink hover:bg-sunny-yellow-edge md:h-14 md:rounded-[14px] md:text-[17px]">
                    New drive
                    <ArrowRight aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </Link>
            </section>

            <section className="flex flex-col items-start gap-3.5 rounded-[20px] bg-sunny-yellow-pale p-4 font-semibold md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2 md:self-start md:rounded-[28px] md:py-1.5 md:pl-1.5 md:pr-[22px]">
                <h2 className="m-0 rounded-[22px] bg-sunny-ink px-4 py-2 text-[15px] font-bold text-sunny-yellow md:py-[9px]">How it works</h2>
                <Step icon={<Plus aria-hidden="true" className={step} strokeWidth={1.8} />}>Create a drive</Step>
                <ChevronRight aria-hidden="true" className="hidden size-4 md:block" strokeWidth={1.8} />
                <Step icon={<LockOpen aria-hidden="true" className={step} strokeWidth={1.8} />}>Open it and add files</Step>
                <ChevronRight aria-hidden="true" className="hidden size-4 md:block" strokeWidth={1.8} />
                <Step icon={<Lock aria-hidden="true" className={step} strokeWidth={1.8} />}>Close it to hide everything</Step>
            </section>
        </>
    );
}
