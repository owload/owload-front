import { Lock } from "lucide-react";

const Y = ({ children }: { children: string }) => <span className="text-(--lp-yellow)">{children}</span>;

/**
 * "What our servers get": a sample of the ciphertext the server stores. Floating over the product mock-up on wide
 * screens, a plain block under the buttons on narrow ones.
 */
export function ServersCard({ floating }: { floating?: boolean }) {
  const shell = floating
    ? "absolute -right-2 -top-[34px] flex w-[300px] rotate-2 flex-col gap-2.5 rounded-2xl bg-(--lp-ink) p-4 text-left text-white shadow-[0_16px_36px_rgba(42,40,32,0.34)] max-[720px]:hidden"
    : "mt-2 hidden w-full flex-col gap-2.5 rounded-2xl bg-(--lp-ink) p-4 text-left text-white max-[720px]:flex";
  return (
    <div className={`lp-dark ${shell}`}>
      <div className="flex items-center gap-2 text-[14px] font-extrabold">
        <Lock size={16} strokeWidth={2.4} className="text-(--lp-yellow)" aria-hidden="true" />
        <span>What our servers get</span>
      </div>
      <div
        aria-hidden="true"
        className="overflow-hidden whitespace-nowrap font-mono text-[11px] leading-[1.55] text-(--lp-dim)"
      >
        {floating ? (
          <>
            eee6 5f53 e942 1ce5 0211 670e ae67<br />
            f02e <Y>8d28</Y> a790 23c3 9c20 <Y>0661</Y> fccd<br />
            8a29 a0d3 4730 1ef5 6e64 dc3c d608
          </>
        ) : (
          <>
            9065 c314 6e80 a9c2 2267 0bbe 4f4c 5497<br />
            <Y>7656</Y> cf2d 1331 87c8 df95 247f 2866 <Y>028d</Y>
          </>
        )}
      </div>
      <div className="text-[14px] font-bold leading-[1.4] text-white">
        Files are encrypted on your device before upload. Only you can open them. <Y>We can’t.</Y>
      </div>
    </div>
  );
}
