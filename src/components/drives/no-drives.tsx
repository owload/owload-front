import { ArrowRight, ChevronRight, Lock, LockOpen, Plus } from "lucide-react";
import { Link } from "react-router-dom";

function Step({ icon, children }: { icon: React.ReactNode, children: string }) {
    return <span className="flex items-center gap-3 px-1 md:gap-2 md:px-0">{icon}{children}</span>;
}

/** What the drives page shows instead of the list when there are no drives. */
export function NoDrives() {
    const step = "size-[17px]";
    return (
        <>
            <section className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl bg-sunny-yellow-surface p-5 text-sunny-ink shadow-[0_14px_32px_rgba(0,0,0,0.14)] md:p-6">
                <div className="flex size-14 flex-none items-center justify-center rounded-[14px] bg-sunny-ink text-sunny-yellow">
                    <Lock aria-hidden="true" className="size-6" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-[1_1_300px]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sunny-text-on-yellow">Get started</div>
                    <h2 className="m-0 mt-1 text-[22px] font-semibold leading-[1.25]">You have no drives yet</h2>
                    <p className="m-0 mt-1.5 max-w-[560px] text-sunny-text-on-yellow">A drive is an encrypted space for your files. Open it to work with them, close it to hide everything again.</p>
                </div>
                <Link to="/create" className="flex h-11 items-center gap-2 rounded-[10px] bg-sunny-ink px-[18px] font-semibold text-sunny-yellow hover:bg-sunny-ink/90">
                    New drive
                    <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
                </Link>
            </section>

            <section className="flex flex-col items-start gap-3 rounded-2xl border border-sunny-line bg-white p-4 font-medium md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2 md:self-start md:py-2 md:pl-2 md:pr-5">
                <h2 className="m-0 rounded-full bg-sunny-field px-4 py-2 font-semibold">How it works</h2>
                <Step icon={<Plus aria-hidden="true" className={step} strokeWidth={1.8} />}>Create a drive</Step>
                <ChevronRight aria-hidden="true" className="hidden size-4 md:block" strokeWidth={1.8} />
                <Step icon={<LockOpen aria-hidden="true" className={step} strokeWidth={1.8} />}>Open it and add files</Step>
                <ChevronRight aria-hidden="true" className="hidden size-4 md:block" strokeWidth={1.8} />
                <Step icon={<Lock aria-hidden="true" className={step} strokeWidth={1.8} />}>Close it to hide everything</Step>
            </section>
        </>
    );
}
