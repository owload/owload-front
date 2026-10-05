import { useLogin, useRegister } from "@/auth-context-provider";
import { NAV_LINKS } from "./data";
import { Logo } from "./logo";

export function LandingHeader() {
  const login = useLogin();
  const register = useRegister();
  return (
    <header className="relative mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[clamp(20px,4vw,40px)] py-5">
      <a href="#top" aria-label="Owload home" className="flex min-h-11 items-center">
        <Logo height={38} />
      </a>
      <nav aria-label="Main" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[16px] font-semibold max-[720px]:hidden">
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} className="lp-link flex min-h-11 items-center rounded-[10px] px-3.5">
            {l.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2 text-[16px] font-bold">
        <button type="button" onClick={() => login()} className="lp-link flex min-h-11 cursor-pointer items-center rounded-xl px-4">
          Sign in
        </button>
        <button type="button" onClick={() => register()} className="lp-btn flex min-h-11 cursor-pointer items-center rounded-xl bg-white px-5 hover:bg-(--lp-field)">
          Sign up
        </button>
      </div>
    </header>
  );
}
