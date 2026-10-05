import { NAV_LINKS } from "./data";
import { Logo } from "./logo";

export function LandingFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[clamp(20px,4vw,40px)] py-7 text-[15px]">
      <a href="#top" aria-label="Owload home" className="flex min-h-11 items-center">
        <Logo height={30} />
      </a>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold text-(--lp-text-white)">
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} className="lp-link flex min-h-11 items-center rounded-[10px] px-3">{l.label}</a>
        ))}
      </nav>
      <div className="text-(--lp-muted)">© Owload</div>
    </footer>
  );
}
